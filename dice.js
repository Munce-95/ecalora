// 🔹 Initialisation de Supabase
const SUPABASE_URL = "https://sxwltroedzxkvqpbcqjc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4d2x0cm9lZHp4a3ZxcGJjcWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjQxNzIsImV4cCI6MjA1NjAwMDE3Mn0.F_XIxMSvejY2xLde_LbLcLt564fiW2zF-wqr95rZ2zA"; // Remplace avec ta clé API
const API_HISTORIQUE = `${SUPABASE_URL}/rest/v1/ecalorahisto`;

// 🔹 TEST_MODE : Utiliser la `Service Role Key` si Supabase bloque toujours (mettre à `true` si besoin)
const TEST_MODE = false; // ⬅️ Mettre `true` uniquement pour tester avec la `Service Role`

// 🔹 Récupération de l'utilisateur connecté (Depuis `sessionStorage`)
const user = JSON.parse(sessionStorage.getItem("user"));
if (!user) {
    window.location.href = "auth.html";
}
document.getElementById("welcome-message").innerText = `Bonjour ${user.pseudo} !`;

// 🔹 Génération d’un dé 100 (Ton ancien algorithme)
function random_roll() {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const randomNumber = randomArray[0] % 1000000;
    const thousands = Math.floor(randomNumber / 1000) % 10;
    const tens = Math.floor((randomNumber % 100) / 10);
    return (thousands === 0 && tens === 0) ? 100 : (thousands * 10 + tens);
}

// 🔹 Lancer un dé avec une statistique
async function lancerDe(stat) {
    let resultat = random_roll();
    console.log(`🎲 ${user.pseudo} (${stat}) → ${resultat}`);

    // 🔹 Affichage du résultat
    document.getElementById("resultat").innerHTML = `
        <h3>Lancer pour "<strong>${stat}</strong>" :</h3>
        <h2>${resultat}</h2>
    `;

    // 🔹 Enregistrer le jet dans l'historique
    await enregistrerHistorique(user.id, user.pseudo, stat, resultat);
}

// 🔹 Lancer un dé neutre (d100)
async function lancerDeNeutre() {
    let resultat = random_roll();
    console.log(`🎲 Dé Neutre → ${resultat}`);

    document.getElementById("resultat").innerHTML = `
        <h3>Lancer du "<strong>Dé 100</strong>" :</h3>
        <h2>${resultat}</h2>
    `;

    await enregistrerHistorique(user.id, user.pseudo, "Dé Neutre", resultat);
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

    document.getElementById("resultat").innerHTML = `
        <h3>Résultat pour "<strong>Dégâts (D${degatType})</strong>" :</h3>
        <h2 class="degats">${resultat} dégâts</h2>
    `;

    await enregistrerHistorique(user.id, user.pseudo, `Dégâts (D${degatType})`, resultat);
}

// 🔹 Enregistrer un jet dans `ecalorahisto`
async function enregistrerHistorique(userId, pseudo, stat, resultat) {
    let jetData = {
        _user_id: userId,
        _pseudo: pseudo,
        _stat: stat,
        _result: resultat
    };

    console.log("📤 Envoi via RPC :", JSON.stringify(jetData, null, 2));

    try {
        let response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_dice_roll`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY
            },
            body: JSON.stringify(jetData)
        });

        console.log("✅ Requête envoyée à Supabase, réponse HTTP :", response.status);

        if (!response.ok) {
            throw new Error(`Erreur Supabase : ${response.statusText}`);
        }

        console.log("✅ Jet ajouté via RPC !");
        chargerHistorique(); // 🔹 Mise à jour de l'historique immédiatement
    } catch (error) {
        console.error("❌ Erreur lors de l'enregistrement via RPC :", error);
    }
}



// 🔹 Charger l’historique
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

// 🔹 Supprimer l’historique
async function resetHistorique() {
    try {
        let response = await fetch(`${API_HISTORIQUE}?created_at=not.is.null`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY
            }
        });

        console.log("✅ Historique ENTIER supprimé !");
        chargerHistorique();
    } catch (error) {
        console.error("❌ Erreur suppression historique :", error);
    }
}


// 🔹 Affichage de l’historique
function afficherHistorique(jets) {
    let historiqueContainer = document.getElementById("ecalorahisto");
    if (!historiqueContainer) return;

    historiqueContainer.innerHTML = "";
    jets.forEach(jet => {
        let li = document.createElement("li");
        li.innerHTML = `<strong>${jet.stat}</strong> :
                        <span>${jet.result}</span>
                        <br><span>(${jet.pseudo})</span>`;
        historiqueContainer.appendChild(li);
    });
}

// 🔹 Rafraîchir l'historique toutes les 5 secondes
setInterval(chargerHistorique, 1000);
document.addEventListener("DOMContentLoaded", chargerHistorique);
