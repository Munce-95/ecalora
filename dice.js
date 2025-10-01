// 🔹 Initialisation de Supabase
const SUPABASE_URL = "https://sxwltroedzxkvqpbcqjc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4d2x0cm9lZHp4a3ZxcGJjcWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjQxNzIsImV4cCI6MjA1NjAwMDE3Mn0.F_XIxMSvejY2xLde_LbLcLt564fiW2zF-wqr95rZ2zA";
const API_HISTORIQUE = `${SUPABASE_URL}/rest/v1/ecalorahisto`;
const API_PERSONNAGES = `${SUPABASE_URL}/rest/v1/characters`;

// 🔹 Récupération de l'utilisateur connecté
const user = JSON.parse(sessionStorage.getItem("user"));
if (!user) {
    window.location.href = "auth.html";
}

// 🔹 Génération d’un dé 100 (Méthode sécurisée)
function random_roll() {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const randomNumber = randomArray[0] % 1000000;
    const thousands = Math.floor(randomNumber / 1000) % 10;
    const tens = Math.floor((randomNumber % 100) / 10);
    return (thousands === 0 && tens === 0) ? 100 : (thousands * 10 + tens);
}

const STAT_LABELS = {
    "corps_a_corps": "Corps à Corps",
    "distance": "Distance",
    "mentir_convaincre": "Mentir/Convaincre",
    "intimidation": "Intimidation",
    "intelligence": "Intelligence",
    "courir_sauter": "Courir/Sauter",
    "perception": "Perception",
    "reflexe": "Réflexe",
    "mental": "Mental",
    "Dé Neutre": "Dé 100",
    "internet": "Internet",
    "Dégâts": "Dégâts"
};

let previousPlayers = [];

// 🔹 Fonction pour afficher les Points de Vie des joueurs
async function afficherHealth() {
    const healthContainer = document.getElementById("health-container");
    if (!healthContainer) return;

    try {
        // 🔹 Récupérer tous les personnages avec un ordre fixe par nom
        let response = await fetch(`${API_PERSONNAGES}?select=id,nom,pdv,max_pdv&order=nom.asc`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        let players = await response.json();

        // 🔹 Comparer uniquement les PV pour détecter un vrai changement
        let hasChanged = players.some((p, i) => {
            return !previousPlayers[i] || previousPlayers[i].pdv !== p.pdv;
        });

        if (!hasChanged) return; // rien à faire si aucun changement
        previousPlayers = players.map(p => ({ id: p.id, pdv: p.pdv }));

        // 🔹 Re-render du conteneur
        healthContainer.innerHTML = "<h3>Points de Vie des joueurs :</h3>";

        players.forEach(player => {
            const playerDiv = document.createElement("div");
            playerDiv.className = "player-health";

            // texte PV actuel / max
            const text = document.createElement("p");
            text.textContent = `${player.nom} : ${player.pdv} / ${player.max_pdv}`;
            playerDiv.appendChild(text);

            // barre de vie
            const barContainer = document.createElement("div");
            barContainer.className = "health-bar-container";

            const bar = document.createElement("div");
            bar.className = "health-bar";
            bar.style.width = (player.pdv / player.max_pdv * 100) + "%";

            barContainer.appendChild(bar);
            playerDiv.appendChild(barContainer);

            healthContainer.appendChild(playerDiv);
        });

    } catch (error) {
        console.warn("⚠️ Impossible de récupérer les PV (rafraîchissement ignoré) :", error);
    }
}

// 🔹 Charger les PV au démarrage et toutes les secondes
document.addEventListener("DOMContentLoaded", afficherHealth);
setInterval(afficherHealth, 1000);


// 🔹 Vérifier si l'utilisateur est le MJ
const isMJ = user.pseudo === "Zevra";

// 🔹 Objet pour stocker les bonus/malus temporaires
let temporaryModifiers = {};

// 🔹 Affichage interface MJ
async function initMJInterface() {
    if (!isMJ) return;

    document.getElementById("bonus-malus-container").style.display = "block";

    // Récupérer la liste des joueurs
    let response = await fetch(`${API_PERSONNAGES}?select=id,nom`, {
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
    });
    let players = await response.json();

    const select = document.getElementById("player-select");
    players.forEach(player => {
        const option = document.createElement("option");
        option.value = player.id;
        option.textContent = player.nom;
        select.appendChild(option);
    });
}

document.addEventListener("DOMContentLoaded", initMJInterface);


function ajouterBonusMalus() {
    const playerId = document.getElementById("player-select").value;
    const stat = document.getElementById("stat-select").value;
    const value = parseInt(document.getElementById("bonus-value").value, 10);

    if (!playerId || isNaN(value)) {
        alert("Veuillez sélectionner un joueur et entrer une valeur valide.");
        return;
    }

    // Créer l'objet si nécessaire
    if (!temporaryModifiers[playerId]) temporaryModifiers[playerId] = {};
    temporaryModifiers[playerId][stat] = value;

    alert(`Bonus/Malus de ${value} appliqué au prochain jet de ce joueur (${stat}) !`);
}




// 🔹 Fonction pour lancer un dé avec une statistique
async function lancerDe(stat) {
    let resultat = random_roll();

    // 🔹 Récupérer la fiche du personnage
    let response = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}&select=nom,${stat}`, {
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
    });
    let data = await response.json();

    let characterName = "Inconnu";
    let statValeur = 50;
    if (Array.isArray(data) && data.length > 0) {
        characterName = data[0].nom;
        statValeur = data[0][stat];
    }

    // 🔹 BONUS/MALUS : appliquer sur la stat
    let bonus = temporaryModifiers[user.id]?.[stat] || 0;
    let statEffective = statValeur + bonus;

    // 🔹 Supprimer le bonus après utilisation
    if (temporaryModifiers[user.id]?.[stat]) delete temporaryModifiers[user.id][stat];

    // 🔹 Déterminer l'issue en comparant au statEffective
    let issue = determinerIssue(resultat, statEffective);

    console.log(`🎲 ${user.pseudo} (${stat}) → ${resultat} vs ${statValeur} (bonus ${bonus}) → ${issue}`);

    document.getElementById("resultat").innerHTML = `
        <h3>Lancer pour "<strong>${STAT_LABELS[stat] || stat}</strong>" :</h3>
        <h2>${resultat} - ${issue}</h2>
    `;

    await enregistrerHistorique(user.id, characterName, stat, resultat, issue);
}




// 🔹 Lancer un dé de dégâts (utilisateur définit la valeur du dé)
async function lancerDegats() {
    let degatInput = document.getElementById("degatsInput").value;
    let degatType = parseInt(degatInput, 10);

    if (isNaN(degatType) || degatType < 2) {
        alert("Veuillez entrer un type de dé valide (ex: 6, 8, 10, 12...).");
        return;
    }

    let resultat = Math.floor(Math.random() * degatType) + 1;
    console.log(`💥 ${user.pseudo} a lancé un D${degatType} → ${resultat} dégâts`);

    // 🔹 Récupérer le nom du personnage de l'utilisateur
    let response = await fetch(`${SUPABASE_URL}/rest/v1/characters?user_id=eq.${user.id}&select=nom`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY
        }
    });

    let data = await response.json();
    let characterName = (Array.isArray(data) && data.length > 0) ? data[0].nom : "Inconnu";

    // 🔹 Affichage du résultat dans l'UI
    document.getElementById("resultat").innerHTML = `
        <h3>Résultat pour "<strong>Dégâts (D${degatType})</strong>" :</h3>
        <h2 class="degats">${resultat} dégâts</h2>
    `;

    // 🔹 Enregistrer dans l'historique (issue = "Dégâts" pour différencier)
    await enregistrerHistorique(user.id, characterName, `Dégâts (D${degatType})`, resultat, "Dégâts");
}

// 🔹 Lancer un dé neutre (d100)
async function lancerDeNeutre() {
    let resultat = random_roll();
    console.log(`🎲 Dé Neutre → ${resultat}`);

    // 🔹 Récupérer le nom du personnage de l'utilisateur
    let response = await fetch(`${SUPABASE_URL}/rest/v1/characters?user_id=eq.${user.id}&select=nom`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY
        }
    });

    let data = await response.json();
    let characterName = (Array.isArray(data) && data.length > 0) ? data[0].nom : "Inconnu";

    // 🔹 Affichage du résultat dans l'UI
    document.getElementById("resultat").innerHTML = `
        <h3>Résultat du "<strong>Dé 100</strong>" :</h3>
        <h2>${resultat}</h2>
    `;

    // 🔹 Enregistrer dans l'historique (issue = "---" car pas d'issue spécifique)
    await enregistrerHistorique(user.id, characterName, "Jet Neutre (d100)", resultat, "");
}


// 🔹 Fonction pour déterminer l'issue d'un jet
function determinerIssue(resultat, stat) {
    if (resultat === 1) return "Super Réussite Critique";
    if (resultat <= 10) return "Réussite Critique";
    if (resultat <= stat) return "Réussite";
    if (resultat >= 90 && resultat < 100) return "Échec Critique";
    if (resultat === 100) return "Super Échec Critique";
    return "Échec";
}

// 🔹 Fonction pour enregistrer un jet dans Supabase
async function enregistrerHistorique(userId, characterName, stat, resultat, issue) {
    let jetData = {
        user_id: userId,
        character_name: characterName,
        stat: stat,
        result: resultat,
        issue: issue
    };

    console.log("📤 Données envoyées à Supabase :", JSON.stringify(jetData, null, 2));

    try {
        let response = await fetch(`${SUPABASE_URL}/rest/v1/ecalorahisto`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization":`Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify(jetData)
        });

        console.log("✅ Jet ajouté avec succès !");
        chargerHistorique();
    } catch (error) {
        console.error("❌ Erreur lors de l'enregistrement :", error);
    }
}


// 🔹 Fonction pour charger l’historique
async function chargerHistorique() {
    let historiqueContainer = document.getElementById("ecalorahisto");
    if (!historiqueContainer) return;

    try {
        let response = await fetch(`${API_HISTORIQUE}?order=created_at.desc&limit=10`, {
            method: "GET",
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
        });

        if (!response.ok) return;

        let data = await response.json();
        afficherHistorique(data);
    } catch (error) {
    }
}

// 🔹 Fonction pour afficher l’historique des jets
function afficherHistorique(jets) {
    let historiqueContainer = document.getElementById("ecalorahisto");
    if (!historiqueContainer) return;

    historiqueContainer.innerHTML = "";
    jets.forEach(jet => {
        let statLabel = STAT_LABELS[jet.stat] || jet.stat; // ✅ Remplace le nom technique

        let li = document.createElement("li");
        li.innerHTML = `<strong>${jet.character_name}</strong> <br>
                        <strong>${statLabel}</strong> : ${jet.result}<br>${jet.issue}
                        <br>----------------------`;
        historiqueContainer.appendChild(li);
    });
}


// 🔹 Supprimer l’historique
async function resetHistorique() {
    try {
        let response = await fetch(`${API_HISTORIQUE}?created_at=not.is.null`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
        });

        console.log("✅ Historique ENTIER supprimé !");
        chargerHistorique();
    } catch (error) {
        console.error("❌ Erreur suppression historique :", error);
    }
}

// 🔹 Rafraîchir l'historique toutes les secondes
setInterval(chargerHistorique, 1000);
document.addEventListener("DOMContentLoaded", chargerHistorique);
