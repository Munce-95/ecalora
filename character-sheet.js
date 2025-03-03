// 🔹 Initialisation de Supabase (API REST uniquement)
const SUPABASE_URL = "https://sxwltroedzxkvqpbcqjc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4d2x0cm9lZHp4a3ZxcGJjcWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjQxNzIsImV4cCI6MjA1NjAwMDE3Mn0.F_XIxMSvejY2xLde_LbLcLt564fiW2zF-wqr95rZ2zA"; // Remplace avec ta clé API
const API_PERSONNAGES = `${SUPABASE_URL}/rest/v1/characters`;

// 🔹 Fonction pour charger les données du personnage
async function chargerFichePersonnage() {
    const user = JSON.parse(sessionStorage.getItem("user"));

    if (!user) {
        console.error("❌ Aucun utilisateur connecté !");
        window.location.href = "auth.html";
        return;
    }

    try {
        let response = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY
            }
        });

        let data = await response.json();

        if (data.length === 0) {
            console.error("❌ Aucun personnage trouvé !");
            window.location.href = "new-character.html"; // 🔹 Redirige si aucune fiche trouvée
            return;
        }

        let personnage = data[0];

        // 🔹 Mise à jour des champs HTML
        document.getElementById("nomPersonnage").value = personnage.nom || "";
        document.getElementById("corps_a_corps").value = personnage.corps_a_corps ?? 50;
        document.getElementById("distance").value = personnage.distance ?? 50;
        document.getElementById("mentir_convaincre").value = personnage.mentir_convaincre ?? 50;
        document.getElementById("intimidation").value = personnage.intimidation ?? 50;
        document.getElementById("intelligence").value = personnage.intelligence ?? 50;
        document.getElementById("courir_sauter").value = personnage.courir_sauter ?? 50;
        document.getElementById("perception").value = personnage.perception ?? 50;
        document.getElementById("reflexe").value = personnage.reflexe ?? 50;
        document.getElementById("mental").value = personnage.mental ?? 50;

    } catch (error) {
        console.error("❌ Erreur lors du chargement de la fiche :", error);
    }
}

// 🔹 Fonction pour sauvegarder la fiche de personnage
async function sauvegarderPersonnage() {
    const user = JSON.parse(sessionStorage.getItem("user"));

    let updatedData = {
        nom: document.getElementById("nomPersonnage").value,
        corps_a_corps: parseInt(document.getElementById("corps_a_corps").value),
        distance: parseInt(document.getElementById("distance").value),
        mentir_convaincre: parseInt(document.getElementById("mentir_convaincre").value),
        intimidation: parseInt(document.getElementById("intimidation").value),
        intelligence: parseInt(document.getElementById("intelligence").value),
        courir_sauter: parseInt(document.getElementById("courir_sauter").value),
        perception: parseInt(document.getElementById("perception").value),
        reflexe: parseInt(document.getElementById("reflexe").value),
        mental: parseInt(document.getElementById("mental").value)
    };

    try {
        let response = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            throw new Error("Erreur lors de la mise à jour.");
        }

        alert("Fiche mise à jour avec succès !");
        chargerFichePersonnage();

    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour du personnage :", error);
    }
}

// 🔹 Charger la fiche au démarrage
document.addEventListener("DOMContentLoaded", chargerFichePersonnage);
