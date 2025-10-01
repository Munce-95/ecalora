// =======================
// CONFIGURATION SUPABASE
// =======================
const SUPABASE_URL = "https://sxwltroedzxkvqpbcqjc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4d2x0cm9lZHp4a3ZxcGJjcWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjQxNzIsImV4cCI6MjA1NjAwMDE3Mn0.F_XIxMSvejY2xLde_LbLcLt564fiW2zF-wqr95rZ2zA";
const API_HISTORIQUE = `${SUPABASE_URL}/rest/v1/ecalorahisto`;
const API_PERSONNAGES = `${SUPABASE_URL}/rest/v1/characters`;

// Statistiques affichées
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

// =======================
// UTILITAIRES
// =======================

// Récupération de l'utilisateur connecté
const user = JSON.parse(sessionStorage.getItem("user"));
if (!user) window.location.href = "auth.html";

// Dé sécurisé 1-100
function random_roll() {
    const randArray = new Uint32Array(1);
    crypto.getRandomValues(randArray);
    const num = randArray[0] % 1000000;
    const thousands = Math.floor(num / 1000) % 10;
    const tens = Math.floor((num % 100) / 10);
    return (thousands === 0 && tens === 0) ? 100 : (thousands * 10 + tens);
}

// Déterminer l'issue d'un jet
function determinerIssue(resultat, stat) {
    if (resultat === 1) return "Super Réussite Critique";
    if (resultat <= 10) return "Réussite Critique";
    if (resultat <= stat) return "Réussite";
    if (resultat >= 90 && resultat < 100) return "Échec Critique";
    if (resultat === 100) return "Super Échec Critique";
    return "Échec";
}

// =======================
// AFFICHAGE POINTS DE VIE
// =======================
let previousPlayers = [];

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
            div.innerHTML = `
                <p>${p.nom} : ${p.pdv} / ${p.max_pdv}</p>
                <div class="health-bar-container">
                    <div class="health-bar" style="width:${(p.pdv / p.max_pdv * 100)}%"></div>
                </div>
            `;
            container.appendChild(div);
        });

    } catch (error) {
        console.warn("Impossible de récupérer les PV :", error);
    }
}

// =======================
// HISTORIQUE DES JETS
// =======================

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
        console.error("Erreur chargement historique :", err);
    }
}

function afficherHistorique(jets) {
    const container = document.getElementById("ecalorahisto");
    if (!container) return;

    container.innerHTML = "";
    jets.forEach(jet => {
        const statLabel = STAT_LABELS[jet.stat] || jet.stat;
        const li = document.createElement("li");
        li.innerHTML = `<strong>${jet.character_name}</strong><br>
                        <strong>${statLabel}</strong> : ${jet.result}<br>${jet.issue}<br>----------------------`;
        container.appendChild(li);
    });
}

// Supprimer l'historique complet
async function resetHistorique() {
    try {
        await fetch(`${API_HISTORIQUE}?created_at=not.is.null`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
        });
        chargerHistorique();
    } catch (err) {
        console.error("Erreur suppression historique :", err);
    }
}

// =======================
// LANCER DES DÉS
// =======================

async function lancerDe(stat) {
    const resultat = random_roll();

    const response = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}&select=nom,${stat}`, {
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
    });
    const data = await response.json();

    const characterName = (Array.isArray(data) && data.length > 0) ? data[0].nom : "Inconnu";
    const statValeur = (Array.isArray(data) && data.length > 0) ? data[0][stat] : 50;

    const issue = determinerIssue(resultat, statValeur);

    document.getElementById("resultat").innerHTML = `
        <h3>Lancer pour "<strong>${STAT_LABELS[stat] || stat}</strong>" :</h3>
        <h2>${resultat} - ${issue}</h2>
    `;

    await enregistrerHistorique(user.id, characterName, stat, resultat, issue);
}

async function lancerDegats() {
    const degatInput = document.getElementById("degatsInput").value;
    const degatType = parseInt(degatInput, 10);

    if (isNaN(degatType) || degatType < 2) return alert("Veuillez entrer un type de dé valide.");

    const resultat = Math.floor(Math.random() * degatType) + 1;

    const resp = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}&select=nom`, {
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
    });
    const characterName = (Array.isArray(resp) && resp.length > 0) ? (await resp.json())[0].nom : "Inconnu";

    document.getElementById("resultat").innerHTML = `
        <h3>Résultat pour "<strong>Dégâts (D${degatType})</strong>" :</h3>
        <h2 class="degats">${resultat} dégâts</h2>
    `;

    await enregistrerHistorique(user.id, characterName, `Dégâts (D${degatType})`, resultat, "Dégâts");
}

async function lancerDeNeutre() {
    const resultat = random_roll();

    const resp = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}&select=nom`, {
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
    });
    const characterName = (Array.isArray(resp) && resp.length > 0) ? (await resp.json())[0].nom : "Inconnu";

    document.getElementById("resultat").innerHTML = `
        <h3>Résultat du "<strong>Dé 100</strong>" :</h3>
        <h2>${resultat}</h2>
    `;

    await enregistrerHistorique(user.id, characterName, "Jet Neutre (d100)", resultat, "");
}

// =======================
// ENREGISTREMENT DES JETS
// =======================
async function enregistrerHistorique(userId, characterName, stat, resultat, issue) {
    const jetData = { user_id: userId, character_name: characterName, stat, result: resultat, issue };

    try {
        await fetch(`${SUPABASE_URL}/rest/v1/ecalorahisto`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify(jetData)
        });
        chargerHistorique();
    } catch (err) {
        console.error("Erreur lors de l'enregistrement :", err);
    }
}

// =======================
// INITIALISATION
// =======================
document.addEventListener("DOMContentLoaded", () => {
    afficherHealth();
    chargerHistorique();

    setInterval(afficherHealth, 1000);
    setInterval(chargerHistorique, 1000);
});
