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


function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}


function showMessage(message, type) {
    // Créer ou utiliser un élément pour afficher les messages
    let messageElement = document.getElementById('messageContainer');

    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'messageContainer';
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 15px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            min-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(messageElement);
    }

    messageElement.textContent = message;
    messageElement.className = type === 'success' ? 'message-success' : 'message-error';
    messageElement.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
    messageElement.style.display = 'block';

    // Auto-hide après 5 secondes
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}


// ========================================
// OBSERVER D'AUTHENTIFICATION
// ========================================
auth.onAuthStateChanged(async (user) => {
    currentUser = user;

    if (user) {
        console.log('✅ Utilisateur connecté:', user.displayName);

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

    console.log('🔍 Début de loadArticles');
    console.log('isAdmin:', isAdmin);
    console.log('container:', document.getElementById('articlesContainer'));
    const snapshot = await db.collection('articles');

    // Dans le .then() après .get()
    console.log('📊 Nombre d\'articles:', snapshot.size);


    if (isLoadingArticles) return; {
        isLoadingArticles = true;

    }

    console.log('📰 Chargement des articles...');
    const container = document.getElementById('articlesContainer'); // Bon ID
    container.innerHTML = "";

    if (!container) {
        console.error('Container articles non trouvé');
        isLoadingArticles = false;
        return;
    }

    // Afficher le spinner
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            Chargement des articles...
        </div>
    `;

    try {
        // Charger depuis Firestore
        db.collection('articles')
            .where('published', '==', true)
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    container.innerHTML = `
                        <div class="loading">
                            <p>Aucun article publié pour le moment.</p>
                            ${isAdmin ? '<button onclick="openModal(\'articleModal\')" class="btn-primary">Créer le premier article</button>' : ''}
                        </div>
                    `;
                    return;
                }

                let articlesHTML = '';
                snapshot.forEach(doc => {
                    const article = doc.data();
                    const articleDate = article.createdAt ? article.createdAt.toDate().toLocaleDateString('fr-FR') : 'Date inconnue';

                    articlesHTML += `
                        <div class="article-card">
                            <div class="article-header">
                                <h2 class="article-title">${article.title}</h2>
                                ${isAdmin ? `
                                    <div class="article-actions">
                                        <button onclick="editArticle('${doc.id}')" class="btn-secondary btn-small">Modifier</button>
                                        <button onclick="deleteArticle('${doc.id}')" class="btn-danger btn-small">Supprimer</button>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="article-meta">
                                <span>📅 ${articleDate}</span>
                                <span>👤 ${article.author || 'Auteur inconnu'}</span>
                            </div>
                            <div class="article-content">${article.content}</div>

                            <div class ="comments-section id = "comments-section-${doc.id}">
                            <h4>💬 Commentaires</h4>
            <div id="comments-list-${doc.id}">Chargement...</div>
            
            ${currentUser ? `
            <form onsubmit="addComment(event, '${doc.id}')">
                <input type="text" id="comment-input-${doc.id}" placeholder="Écrire un commentaire..." required>
                <button type="submit" class="btn-primary" onclick="addComment">Envoyer</button>
            </form>
            ` : `<p><em>Connectez-vous pour commenter</em></p>`}
        </div>
                        </div>
                    `;
                });

                container.innerHTML = articlesHTML;
                console.log('✅ Articles chargés avec succès');
            })
            .catch(error => {
                console.error('❌ Erreur lors du chargement:', error);
                container.innerHTML = `
                    <div class="loading">
                        <p>❌ Erreur lors du chargement des articles</p>
                        <button onclick="loadArticles()" class="btn-primary">Réessayer</button>
                    </div>
                `;
            });
    } catch (error) {
        console.error('❌ Erreur:', error);
        container.innerHTML = '<div class="loading">❌ Erreur de connexion</div>';
    } finally {
        isLoadingArticles = false;
    }
    snapshot.forEach(doc=>{
        loadComments(doc.id);
    })
}



async function handleArticleSubmit(e) {
    e.preventDefault();

    const published = document.getElementById('articlePublished').checked;
    const titre = document.getElementById('articleTitle').value.trim();
    const contenu = document.getElementById('articleContent').value.trim();

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
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),


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


        closeModal("articleModal");
        loadArticles();
    } catch (error) {
        console.error("❌ Erreur lors de la soumission de l'article :", error);
        showMessage("Erreur lors de l’enregistrement de l’article", "error");
    }
}



async function searchArticles(searchTerm) {
    try {
        const snapshot = await db.collection('articles')
            .where('published', '==', true)
            .get();

        const result = [];
        snapshot.forEach(doc => {
            const article = doc.data();
            if (article.title.toLowerCase().includes(searchTerm.toLowerCase()) || article.content.toLowerCase().includes(searchTerm.toLowerCase())) {
                result.push({ id: doc.id, data: article });
            }
        });

        displaySearchResults(results);

    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        showMessage('Erreur lors de la recherche', error);
    }
}


async function deleteArticle(articleId) {
    if (!isAdmin) {
        showMessage('Action non autorisée', error);
        return;
    }

    if (confirm('Êtes-vous sur de vouloir supprimer cet article?')) {
        try {
            await db.collection('articles').doc(articleId).delete();
            showMessage('Article supprimé avec succès', 'success');
            loadArticles();

        } catch (error) {
            console.error('Erreur lors de la suppression', error);
            showMessage('Erreur lors de la suppression de l\'article', 'error');
        }
    }
}

async function editArticle(articleId) {
    if (!isAdmin) {
        showMessage('Action non autorisée', 'error');
        return;
    }
    
    try {
        const doc = await db.collection('articles').doc(articleId).get();
        
        if (doc.exists) {
            const article = doc.data();
            
            // Remplir le formulaire
            document.getElementById('articleTitle').value = article.title || '';
            document.getElementById('articleContent').value = article.content || '';
            document.getElementById('articlePublished').checked = article.published !== false;
            
            // Stocker l'ID pour la modification
            currentEditingArticle = articleId;
            
            // Ouvrir le modal
            document.getElementById('articleModalTitle').textContent = 'Modifier l\'article';
            openModal('articleModal');
        }
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        showMessage('Erreur lors du chargement de l\'article', 'error');
    }
}



function createArticleElement(id, article) {
    const articleDiv = document.createElement('div');
    articleDiv.className = 'article-card';
    articleDiv.innerHTML = `<div class="article-header">
            <h3>${escapeHtml(article.title)}</h3>
            <div class="article-meta">
                <span>Par ${escapeHtml(article.author)}</span>
                <span>${formatDate(article.createdAt)}</span>
            </div>
        </div>
        <div class="article-content">
            <p>${escapeHtml(article.content).substring(0, 200)}${article.content.length > 200 ? '...' : ''}</p>
        </div>
        ${currentUser ? `
            <div class="article-actions">
                <button onclick="editArticle('${id}')" class="btn-edit">✏️ Modifier</button>
                <button onclick="deleteArticle('${id}')" class="btn-delete">🗑️ Supprimer</button>
            </div>`: ''}
            `;
    return articleDiv;
};

async function loadComments(articleId){
    try{
        const commentsContainer =  document.getElementById(`comments-list-${articleId}`);
        if(!commentsContainer){
            console.error('Commentaire non trouvé pour article:', articleId);
            return;
        }

        commentsContainer.innerHTML = '<p> Chargement des commentaires ... </p>';

        const comments = await getArticleComments(articleId);

        commentsContainer.innerHTML = buildCommentsHTML(comments);
    }catch(error){
        console.error('Erreur comment:', error);
        const commentsContainer = document.getElementById(`comments-list-${articleId}`);
        if(commentsContainer){
            commentsContainer.innerHTML = commentsContainer;
        }
    }
}







async function getArticleComments(articleId) {
    try {
        const snapshot = await db.collection('comments')
            .doc(articleId)
            .collection('comments')
            .orderBy('createdAt', 'asc')
            .get();

        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        return comments;
    } catch (error) {
        console.error('Erreur getArticleComments:', error);
        return [];
    }
}





function buildCommentsHTML(comments){
    if(!comments || comments.length === 0){
        return `${comments}`
    }
    return comments.map(c=>`<div class = "comment">
        <p><strong>${c.author || "Anonyme"}</strong> (${c.createdAt?.toDate().toLocaleDateString("fr-FR") || "?"})</p>
        <p>${c.content}</p>
        </div>
        `).join("");
}

async function addComment(e, articleId) {
    e.preventDefault();
    if (!currentUser) {
        showMessage("Vous devez être connecté pour commenter", "error");
        return;
    }

    const input = document.getElementById(`comment-input-${articleId}`);
    const content = input.value.trim();
    if (!content) {
        showMessage("Veuillez écrire un commentaire", "error");
        return;
    }

    try {
        await db.collection('comments').add({
            articleId: articleId, // ← Référence à l'article
            author: currentUser.displayName || currentUser.email,
            content: content,
            userId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        input.value = "";
        showMessage("✅ Commentaire ajouté", "success");
        // Recharger la liste des commentaires
        await loadComments(articleId);
    
    } catch (error) {
        console.error("Erreur addComment:", error);
        showMessage("Erreur ajout commentaire", "error");
    }
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
