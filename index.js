// 🔹 Initialisation de Supabase (API REST uniquement)
const SUPABASE_URL = "https://sxwltroedzxkvqpbcqjc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4d2x0cm9lZHp4a3ZxcGJjcWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjQxNzIsImV4cCI6MjA1NjAwMDE3Mn0.F_XIxMSvejY2xLde_LbLcLt564fiW2zA"; // Remplace avec ta clé API
const API_PERSONNAGES = `${SUPABASE_URL}/rest/v1/characters`;

// 🔹 Vérifier si l'utilisateur est connecté
document.addEventListener("DOMContentLoaded", () => {
    const user = JSON.parse(sessionStorage.getItem("user"));

    if (!user) {
        console.error("❌ Aucun utilisateur connecté !");
        window.location.href = "auth.html";
        return;
    }

    document.getElementById("welcome-message").innerText = `Bonjour ${user.pseudo} !`;
});

// 🔹 Fonction pour vérifier la fiche et rediriger l'utilisateur
function checkCharacterSheet() {
    const user = JSON.parse(sessionStorage.getItem("user"));

    if (!user) {
        console.error("❌ Aucun utilisateur connecté !");
        window.location.href = "auth.html";
        return;
    }

    fetch(`${API_PERSONNAGES}?user_id=eq.${user.id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.length > 0) {
            window.location.href = "character-sheet.html"; // 🔹 Redirige vers la fiche si elle existe
        } else {
            window.location.href = "new-character.html"; // 🔹 Redirige vers la création sinon
        }
    })
    .catch(error => console.error("❌ Erreur :", error));
}

// 🔹 Déconnexion
function logout() {
    sessionStorage.removeItem("user");
    window.location.href = "auth.html";
}
