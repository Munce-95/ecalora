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

async function changementHealth() {
    try {
        let input = document.getElementById("health-value");
        let newHealth = parseInt(input.value, 10);

        if (isNaN(newHealth)) return alert("⚠️ Entre un nombre valide pour tes PV.");

        // Récupérer le joueur actuel
        let res = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}&select=max_pdv`, {
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        let [joueur] = await res.json();
        if (!joueur) return alert("❌ Personnage introuvable.");

        // Clamp entre 0 et max_pdv
        newHealth = Math.min(Math.max(newHealth, 0), joueur.max_pdv);

        // Update direct
        let update = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
            body: JSON.stringify({ pdv: newHealth })
        });

        if (!update.ok) throw new Error(update.statusText);

        console.log(`✅ PV mis à jour à ${newHealth}`);
        afficherHealth();
        input.value = "";

    } catch (err) {
        console.error("❌ Erreur changementHealth:", err);
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
// BONUS/MALUS (MJ uniquement)
// =======================
function afficherBonusMalusUI() {
    const container = document.getElementById("bonus-malus-container");
    if (!container) return;

    // Seul Zevra voit cette zone
    container.style.display = (user.pseudo === "Zevra") ? "block" : "none";
}

async function appliquerBonusMalus() {
    try {
        const playerSelect = document.getElementById("player-select");
        const statSelect = document.getElementById("stat-select");
        const bonusInput = document.getElementById("bonus-value");

        const playerId = playerSelect.value.trim();
        const stat = statSelect.value;
        const bonus = parseInt(bonusInput.value, 10);

        if (isNaN(bonus)) return alert("⚠️ Entre une valeur valide pour le bonus/malus.");

        // PATCH direct sur modifier_temporaire comme pour PV
        let update = await fetch(`${API_PERSONNAGES}?user_id=eq.${playerId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({ modifier_temporaire: bonus })
        });

        if (!update.ok) throw new Error(update.statusText);

        console.log(`🎯 Bonus/Malus de ${bonus} appliqué à l'ID ${playerId} pour la stat ${stat}`);
        alert("Bonus/Malus appliqué !");

        bonusInput.value = "";

    } catch (err) {
        console.error("❌ Erreur lors de l'application du bonus/malus :", err);
    }
}


// =======================
// LANCER DES DÉS
// =======================
async function lancerDe(stat) {
    const resultat = random_roll();

    // 🔹 Récupérer le personnage actuel avec la stat et le bonus/malus temporaire
    const response = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}&select=id,nom,${stat},modifier_temporaire`, {
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY }
    });
    const data = await response.json();

    // 🔹 Si aucun personnage trouvé, utiliser valeurs par défaut
    const perso = (Array.isArray(data) && data.length > 0) ? data[0] : null;
    const characterName = perso ? perso.nom : "Inconnu";
    const baseStat = perso ? (perso[stat] || 0) : 50;
    const bonus = perso ? (perso.modifier_temporaire || 0) : 0;

    const statValeur = baseStat + bonus;
    const issue = determinerIssue(resultat, statValeur);

    // 🔹 Affichage du résultat
    document.getElementById("resultat").innerHTML = `
        <h3>Lancer pour "<strong>${STAT_LABELS[stat] || stat}</strong>" :</h3>
        <h2>${resultat} - ${issue} ${bonus !== 0 ? `(bonus/malus ${bonus > 0 ? '+' : ''}${bonus})` : ''}</h2>
    `;

    // 🔹 Console fun
    console.log(`🎲 Lancer de dé :
        👤 ID compte : ${user.id}
        🧙 Personnage : ${characterName}
        📊 Statistique : ${stat} (${baseStat})
        ➕ Bonus/Malus : ${bonus}
        🎯 Valeur du dé : ${resultat}
        🏆 Résultat : ${issue}`);

    // 🔹 Enregistrer dans l'historique
    await enregistrerHistorique(user.id, characterName, stat, resultat, issue);

    // 🔹 Réinitialiser le bonus/malus temporaire après utilisation
    if (perso && bonus !== 0) {
        await fetch(`${API_PERSONNAGES}?id=eq.${perso.id}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json", 
                "apikey": SUPABASE_KEY, 
                "Authorization": `Bearer ${SUPABASE_KEY}` 
            },
            body: JSON.stringify({ modifier_temporaire: 0 })
        });
    }
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
    const perso = (Array.isArray(data) && data.length > 0) ? data[0] : null;
    const characterName = perso ? perso.nom : "Inconnu";
    
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
    afficherBonusMalusUI();

    if (user.pseudo === "Zevra") {
        const healthEdit = document.getElementById("health-edit");
        if (healthEdit) healthEdit.style.display = "none";
    }

    setInterval(afficherHealth, 1000);
    setInterval(chargerHistorique, 1000);
});

