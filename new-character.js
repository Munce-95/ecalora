// 🔹 Initialisation de Supabase (API REST uniquement)
const SUPABASE_URL = "https://sxwltroedzxkvqpbcqjc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4d2x0cm9lZHp4a3ZxcGJjcWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjQxNzIsImV4cCI6MjA1NjAwMDE3Mn0.F_XIxMSvejY2xLde_LbLcLt564fiW2zF-wqr95rZ2zA"; // Remplace avec ta clé API
const API_PERSONNAGES = `${SUPABASE_URL}/rest/v1/characters`;

// 🔹 Fonction pour récupérer les headers d'authentification
function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY
    };
}

// 🔹 Vérifier si l'utilisateur a déjà une fiche, sinon le rediriger ici
document.addEventListener("DOMContentLoaded", async () => {
    const user = JSON.parse(sessionStorage.getItem("user"));

    if (!user || !user.id) {
        console.error("❌ Aucun utilisateur connecté !");
        window.location.href = "auth.html";
        return;
    }

    try {
        let response = await fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        let data = await response.json();
        if (data.length > 0) {
            window.location.href = "character-sheet.html"; // 🔹 Redirige si une fiche existe déjà
        }
    } catch (error) {
        console.error("❌ Erreur lors de la vérification de la fiche :", error);
    }
});

// 🔹 Fonction pour créer une nouvelle fiche de personnage
async function creerFichePersonnage() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    
    if (!user || !user.id) {
        console.error("❌ Aucun utilisateur connecté !");
        window.location.href = "auth.html";
        return;
    }

    const personnage = {
        user_id: user.id,  // 🔹 IMPORTANT : Doit correspondre à users.id !
        nom: document.getElementById("nomPersonnage").value.trim(),
        corps_a_corps: parseInt(document.getElementById("corps_a_corps").value, 10),
        distance: parseInt(document.getElementById("distance").value, 10),
        mentir_convaincre: parseInt(document.getElementById("mentir_convaincre").value, 10),
        intimidation: parseInt(document.getElementById("intimidation").value, 10),
        intelligence: parseInt(document.getElementById("intelligence").value, 10),
        courir_sauter: parseInt(document.getElementById("courir_sauter").value, 10),
        perception: parseInt(document.getElementById("perception").value, 10),
        reflexe: parseInt(document.getElementById("reflexe").value, 10),
        mental: parseInt(document.getElementById("mental").value, 10)
    };

    // 🔹 Vérification des valeurs saisies
    if (personnage.nom === "") {
        alert("Veuillez entrer un nom pour votre personnage !");
        return;
    }

    for (let key in personnage) {
        if (key !== "user_id" && key !== "nom" && (personnage[key] < 1 || personnage[key] > 100 || isNaN(personnage[key]))) {
            alert(`La valeur de ${key} doit être entre 1 et 100.`);
            return;
        }
    }

    try {
        const response = await fetch(API_PERSONNAGES, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(personnage)
        });

        if (!response.ok) {
            throw new Error("Erreur lors de la création de la fiche.");
        }

        alert("Fiche créée avec succès !");
        window.location.href = "character-sheet.html";
    } catch (error) {
        console.error("❌ Erreur lors de l'insertion :", error);
    }
}
