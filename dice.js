// 🔹 Initialisation de Supabase
const SUPABASE_URL = "https://sxwltroedzxkvqpbcqjc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4d2x0cm9lZHp4a3ZxcGJjcWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjQxNzIsImV4cCI6MjA1NjAwMDE3Mn0.F_XIxMSvejY2xLde_LbLcLt564fiW2zF-wqr95rZ2zA";
const API_HISTORIQUE = `${SUPABASE_URL}/rest/v1/ecalorahisto`;
const API_PERSONNAGES = `${SUPABASE_URL}/rest/v1/characters`;

// 🔹 Récupération de l'utilisateur connecté
const user = JSON.parse(sessionStorage.getItem("user"));
if (!user) window.location.href = "auth.html";

// 🔹 Dé sécurisé
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

// 🔹 Historique PV
let previousPlayers = [];

// 🔹 Temporary modifiers par ID
let temporaryModifiers = {
    "6072d1ef-735c-4765-a80d-9ddd68d82015": {}, // Hatori
    "a7e398e1-a158-4f8c-adb8-1a14b73b11ed": {}, // Jean
    "d40c95be-4067-4dad-a27d-05176658a550": {}  // Noelle
};

// 🔹 Affichage des PV
async function afficherHealth() {
    const container = document.getElementById("health-container");
    if (!container) return;

    try {
        const response = await fetch(`${API_PERSONNAGES}?select=id,nom,pdv,max_pdv&order=nom.asc`, {
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const players = await response.json();

        let hasChanged = players.some((p, i) => !previousPlayers[i] || previousPlayers[i].pdv !== p.pdv);
        if (!hasChanged) return;

        previousPlayers = players.map(p => ({ id: p.id, pdv: p.pdv }));
        container.innerHTML = "<h3>Points de Vie des joueurs :</h3>";

        players.forEach(p => {
            const div = document.createElement("div");
            div.className = "player-health";
            div.innerHTML = `<p>${p.nom} : ${p.pdv} / ${p.max_pdv}</p>
                             <div class="health-bar-container">
                                <div class="health-bar" style="width:${(p.pdv/p.max_pdv*100)}%"></div>
                             </div>`;
            container.appendChild(div);
        });
    } catch (err) {
        console.warn("⚠️ Impossible de récupérer les PV :", err);
    }
}

// 🔹 Lancer un dé sur une stat
async function lancerDe(stat) {
    const resultat = random_roll();

    // 🔹 Récupérer personnage du compte
    const resp = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}&select=id,nom,${stat}`, {
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
    });
    const data = await resp.json();

    if (!Array.isArray(data) || data.length === 0) return alert("Aucun personnage trouvé !");
    const { id: characterId, nom: characterName } = data[0];
    let statValeur = data[0][stat];

    // 🔹 Appliquer bonus/malus temporaire
    const bonus = temporaryModifiers[characterId]?.[stat] || 0;
    const statEffective = statValeur + bonus;

    if (bonus !== 0) delete temporaryModifiers[characterId][stat];

    const issue = determinerIssue(resultat, statEffective);

    console.log(`🎲 ${user.pseudo} (${characterName} - ${stat}) → ${resultat} vs ${statValeur} (+bonus ${bonus}) → ${issue}`);

    document.getElementById("resultat").innerHTML = `
        <h3>Lancer pour "<strong>${STAT_LABELS[stat] || stat}</strong>" :</h3>
        <h2>${resultat} - ${issue}</h2>
    `;

    await enregistrerHistorique(user.id, characterName, stat, resultat, issue);
}

// 🔹 Fonction MJ pour ajouter un bonus/malus
function ajouterBonusMalus() {
    const playerId = document.getElementById("player-select").value;
    const stat = document.getElementById("stat-select").value;
    const value = parseInt(document.getElementById("bonus-value").value, 10);

    if (!playerId || isNaN(value)) return alert("Sélectionner un personnage et une valeur valide.");

    temporaryModifiers[playerId][stat] = value;
    alert(`Bonus/Malus de ${value} appliqué sur ${stat} pour le personnage choisi !`);
}

// 🔹 Déterminer l'issue
function determinerIssue(resultat, stat) {
    if (resultat === 1) return "Super Réussite Critique";
    if (resultat <= 10) return "Réussite Critique";
    if (resultat <= stat) return "Réussite";
    if (resultat >= 90 && resultat < 100) return "Échec Critique";
    if (resultat === 100) return "Super Échec Critique";
    return "Échec";
}

// 🔹 Historique
async function chargerHistorique() {
    const container = document.getElementById("ecalorahisto");
    if (!container) return;

    try {
        const resp = await fetch(`${API_HISTORIQUE}?order=created_at.desc&limit=10`, {
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
        });
        const data = await resp.json();
        afficherHistorique(data);
    } catch (err) {
        console.error("❌ Erreur chargement historique :", err);
    }
}

function afficherHistorique(jets) {
    const container = document.getElementById("ecalorahisto");
    if (!container) return;
    container.innerHTML = "";
    jets.forEach(jet => {
        let statLabel = STAT_LABELS[jet.stat] || jet.stat;
        const li = document.createElement("li");
        li.innerHTML = `<strong>${jet.character_name}</strong> <br>
                        <strong>${statLabel}</strong> : ${jet.result}<br>${jet.issue}<br>----------------------`;
        container.appendChild(li);
    });
}

// 🔹 Supprimer l’historique
async function resetHistorique() {
    try {
        await fetch(`${API_HISTORIQUE}?created_at=not.is.null`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
        });
        chargerHistorique();
    } catch (err) {
        console.error("❌ Erreur suppression historique :", err);
    }
}

// 🔹 Initialisation
document.addEventListener("DOMContentLoaded", () => {
    afficherHealth();
    chargerHistorique();

    setInterval(afficherHealth, 1000);
    setInterval(chargerHistorique, 1000);

    if (user.pseudo === "Zevra") {
        document.getElementById("bonus-malus-container").style.display = "block";
    }
});
