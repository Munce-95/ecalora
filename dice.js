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
    "Dégâts": "Dégâts"
};


// 🔹 Fonction pour lancer un dé avec une statistique
async function lancerDe(stat) {
    let resultat = random_roll();
    console.log(`🎲 ${user.pseudo} (${stat}) → ${resultat}`);

    // 🔹 Récupérer la fiche du personnage
    let response = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}&select=nom,${stat}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
    });

    let data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
        console.warn(`⚠️ Aucun personnage trouvé. Valeurs par défaut utilisées.`);
        var characterName = "Inconnu";
        var statValeur = 50; // Valeur par défaut
    } else {
        var characterName = data[0].nom;
        var statValeur = data[0][stat];
    }

    // 🔹 Déterminer l'issue du lancer
    let issue = determinerIssue(resultat, statValeur);

    let statLabel = STAT_LABELS[stat] || stat;

    document.getElementById("resultat").innerHTML = `
        <h3>Lancer pour "<strong>${statLabel}</strong>" :</h3>
        <h2>${resultat} - ${issue}</h2>
    `;

    // 🔹 Enregistrer le jet dans l'historique
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
    return "Raté";
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

        let data = await response.json();
        afficherHistorique(data);
    } catch (error) {
        console.error("❌ Erreur chargement historique :", error);
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

// 🔹 Rafraîchir l'historique toutes les 5 secondes
setInterval(chargerHistorique, 1000);
document.addEventListener("DOMContentLoaded", chargerHistorique);
