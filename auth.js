// Initialisation de Supabase
const supabaseUrl = "https://sxwltroedzxkvqpbcqjc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4d2x0cm9lZHp4a3ZxcGJjcWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MjQxNzIsImV4cCI6MjA1NjAwMDE3Mn0.F_XIxMSvejY2xLde_LbLcLt564fiW2zF-wqr95rZ2zA";
console.log("Supabase API chargée");

// Vérifier si l'utilisateur est déjà connecté
document.addEventListener("DOMContentLoaded", () => {
    const user = sessionStorage.getItem("user");
    if (user) {
        window.location.href = "index.html";
    }
});

// Fonction d'inscription
async function signUp() {
    let pseudo = document.getElementById("pseudo").value;
    let password = document.getElementById("password").value;

    if (pseudo.length < 3 || password.length < 6) {
        alert("Pseudo: min 3 caractères. Mot de passe: min 6 caractères.");
        return;
    }

    // Vérifier si le pseudo existe déjà
    const response = await fetch(`${supabaseUrl}/rest/v1/users?pseudo=eq.${pseudo}`, {
        headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
        }
    });

    const existingUser = await response.json();
    if (existingUser.length > 0) {
        alert("Ce pseudo est déjà pris !");
        return;
    }

    // Insérer l'utilisateur
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: "POST",
        headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ pseudo, password })
    });

    if (insertResponse.ok) {
        alert("Inscription réussie ! Vous pouvez vous connecter.");
    } else {
        alert("Erreur lors de l'inscription !");
    }
}

// Fonction de connexion
async function login() {
    let pseudo = document.getElementById("pseudo").value;
    let password = document.getElementById("password").value;

    const response = await fetch(`${supabaseUrl}/rest/v1/users?pseudo=eq.${pseudo}&password=eq.${password}`, {
        headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
        }
    });

    const user = await response.json();
    if (user.length === 0) {
        alert("Pseudo ou mot de passe incorrect !");
    } else {
        sessionStorage.setItem("user", JSON.stringify(user[0]));
        window.location.href = "index.html";
    }
}

// Déconnexion
function logout() {
    sessionStorage.removeItem("user");
    window.location.href = "auth.html";
}
