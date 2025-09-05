// ========================================
// CONFIGURATION FIREBASE
// ========================================

// IMPORTANT : Remplacez par votre propre configuration !
const firebaseConfig = {
    apiKey: "AIzaSyD-rOIEpoV68RJ-Z2Sd2qwCWSBlUZtLzxs",
    authDomain: "blog-tutoriel-azur.firebaseapp.com",
    projectId: "blog-tutoriel-azur",
    storageBucket: "blog-tutoriel-azur.firebasestorage.app",
    messagingSenderId: "526070824601",
    appId: "1:526070824601:web:98c98e9369fe95ea1a4208"
};

// Initialisation de Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========================================
// VARIABLES GLOBALES
// ========================================
let currentUser = null;          // Utilisateur connecté
let currentEditingArticle = null; // Article en cours d'édition
let isAdmin = false;             // Statut admin
let isLoadingArticles = false;   // Flag de chargement



// ========================================
// OBSERVER D'AUTHENTIFICATION
// ========================================
auth.onAuthStateChanged(async (user) => {
    currentUser = user;

    if (user) {
        console.log('✅ Utilisateur connecté:', user.email);

        // Récupérer les informations utilisateur
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                isAdmin = userData.role === 'admin';
                document.getElementById('userInfo').textContent =
                    `Bonjour, ${userData.displayName || user.email}`;
            } else {
                // Créer le profil si inexistant
                await db.collection('users').doc(user.uid).set({
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    role: 'user',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du profil:', error);
        }

        // Mise à jour de l'interface
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';

        if (isAdmin) {
            document.getElementById('adminPanel').style.display = 'block';
        }
    } else {
        console.log('👤 Utilisateur déconnecté');

        // Réinitialisation
        document.getElementById('userInfo').textContent = '';
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('registerBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'none';
        isAdmin = false;
    }

    // Recharger les articles
    loadArticles();
});

// ========================================
// EVENT LISTENERS
// ========================================
async function loadArticles() {
    const container = document.getElementById('articlesContainer');
    
    try {
        // Afficher un indicateur de chargement
        container.innerHTML = '<p>Chargement des articles...</p>';
        
        // 1. Récupérer les articles depuis Firestore
        const snapshot = await db.collection('articles')
            .orderBy('createdAt', 'desc')
            .get();

        // 2. Vider le conteneur
        container.innerHTML = '';

        // 3. Vérifier s'il y a des articles
        if (snapshot.empty) {
            container.innerHTML = '<p>Aucun article à afficher.</p>';
            return;
        }

        // 4. Créer et ajouter chaque article
        snapshot.forEach((doc) => {
            const article = doc.data();
            const articleElement = document.createElement('div');
            articleElement.className = 'article';
            articleElement.innerHTML = `
                <h3>${article.title}</h3>
                <p>${article.content}</p>
                <div class="article-meta">
                    <span>Par ${article.author}</span>
                    <span>•</span>
                    <span>${article.createdAt ? new Date(article.createdAt.toDate()).toLocaleDateString() : 'Date inconnue'}</span>
                </div>
            `;
            container.appendChild(articleElement);
        });

    } catch (error) {
        console.error('Erreur lors du chargement des articles:', error);
        container.innerHTML = '<p class="error">Erreur lors du chargement des articles</p>';
    }
}


function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        

    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove("active");
    }
}


function showMessage(message, type) {
    const container = document.getElementById("showMessage");
    if (!message) {
        return;
    }
    const content = document.createElement("div");
    content.textContent = message;
    container.appendChild(content);
    if (type === "success") {
        content.className = "message-success";
    } else if (type === "error") {
        content.className = "message-error";
    }
    setTimeout(() => {
        content.remove();
    }, 3000)
}




async function handleArticleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const titre = form.querySelector('input[name="titre"]').value.trim();
    const contenu = form.querySelector('textarea[name="contenu"]').value.trim();

    if (!titre || !contenu) {
        showMessage("⚠️ Veuillez remplir tous les champs !", "error");
        return;
    }

    try {
        const article = {
            author: currentUser ? currentUser.email : "anonyme",
            title: titre,
            content: contenu,
            published: true, // ou false si tu veux gérer des brouillons
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (currentEditingArticle) {
            // 🔄 Mise à jour d’un article existant
            await db.collection("articles").doc(currentEditingArticle).update(article);
            showMessage("✅ Article mis à jour avec succès", "success");
            currentEditingArticle = null;
        } else {
            // ➕ Création d’un nouvel article
            await db.collection("articles").add(article);
            showMessage("✅ Nouvel article ajouté", "success");
        }

        form.reset();
        closeModal("articleModal");
        loadArticles();
    } catch (error) {
        console.error("❌ Erreur lors de la soumission de l'article :", error);
        showMessage("Erreur lors de l’enregistrement de l’article", "error");
    }
    // Fonction placeholder - implémentez selon vos besoins
    console.log('📝 Soumission d\'article...');
    // Votre logique de soumission d'article ici
}





document.addEventListener("DOMContentLoaded", () => {
    const registerBtn = document.getElementById("registerBtn");
    if (registerBtn) {
        registerBtn.addEventListener("click", () => openModal("registerModal"));

    } else {
        console.log('bouton introuvable')
    }
})

document.addEventListener('DOMContentLoaded', () => {
    // Boutons d'authentification
    document.getElementById('loginBtn').addEventListener('click',
        () => openModal('loginModal'));

    document.getElementById('registerBtn').addEventListener('click',
        () => openModal('registerModal'));

    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Bouton nouvel article (admin)
    const newArticleBtn = document.getElementById('newArticleBtn');
    if (newArticleBtn) {
        newArticleBtn.addEventListener('click', () => {
            currentEditingArticle = null;
            document.getElementById('articleModalTitle').textContent = 'Nouvel Article';
            document.getElementById('articleForm').reset();
            openModal('articleModal');
        });
    }

    // Formulaires
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('articleForm').addEventListener('submit', handleArticleSubmit);
});


// ========================================
// EVENT LISTENERS
// ========================================

// ========================================
// CONNEXION
// ========================================
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        console.log('🔐 Tentative de connexion...');
        await auth.signInWithEmailAndPassword(email, password);
        closeModal('loginModal');
        showMessage('✅ Connexion réussie !', 'success');
        document.getElementById('loginForm').reset();
    } catch (error) {
        console.error('Erreur de connexion:', error);

        // Messages d'erreur personnalisés
        let message = 'Erreur de connexion';
        switch (error.code) {
            case 'auth/user-not-found':
                message = 'Aucun compte trouvé avec cet email';
                break;
            case 'auth/wrong-password':
                message = 'Mot de passe incorrect';
                break;
            case 'auth/invalid-email':
                message = 'Email invalide';
                break;
            case 'auth/too-many-requests':
                message = 'Trop de tentatives. Réessayez plus tard';
                break;
        }
        showMessage(message, 'error');
    }
}

// ========================================
// INSCRIPTION
// ========================================
async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        console.log('📝 Création du compte...');

        // Créer le compte
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Mettre à jour le profil
        await user.updateProfile({
            displayName: name
        });

        // Créer le document utilisateur
        await db.collection('users').doc(user.uid).set({
            email: email,
            displayName: name,
            role: 'user', // Par défaut, tous les nouveaux utilisateurs sont 'user'
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeModal('registerModal');
        showMessage('✅ Inscription réussie ! Bienvenue ' + name, 'success');
        document.getElementById('registerForm').reset();

    } catch (error) {
        console.error('Erreur d\'inscription:', error);

        let message = 'Erreur lors de l\'inscription';
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'Cet email est déjà utilisé';
                break;
            case 'auth/weak-password':
                message = 'Le mot de passe doit contenir au moins 6 caractères';
                break;
            case 'auth/invalid-email':
                message = 'Email invalide';
                break;
        }
        showMessage(message, 'error');
    }
}




// ========================================
// DÉCONNEXION
// ========================================
function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        auth.signOut()
            .then(() => {
                showMessage('👋 Déconnexion réussie', 'success');
            })
            .catch((error) => {
                console.error('Erreur de déconnexion:', error);
                showMessage('Erreur lors de la déconnexion', 'error');
            });
    }
};
