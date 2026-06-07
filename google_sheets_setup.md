# Guide d'Intégration Google Sheets - SwiftRide VTC

Ce guide vous explique pas-à-pas comment connecter le formulaire de réservation de votre site vitrine directement à un fichier **Google Sheets** (Excel en ligne).

À chaque soumission du formulaire, les données du client (Nom, Date, Trajet, Téléphone, Véhicule...) s'ajouteront automatiquement sur une nouvelle ligne dans votre tableau en temps réel.

---

## 📅 Étape 1 : Créer votre fichier Google Sheet
1. Connectez-vous à votre compte Google.
2. Allez sur [Google Sheets](https://docs.google.com/spreadsheets) et créez une nouvelle feuille de calcul.
3. Donnez un nom à votre fichier (Exemple : `Réservations SwiftRide`).
4. Dans la toute première ligne (Ligne 1), saisissez les en-têtes de colonnes suivants (une colonne par en-tête) :
   *   **A1** : `Horodatage`
   *   **B1** : `Nom`
   *   **C1** : `Email`
   *   **D1** : `Téléphone`
   *   **E1** : `Date & Heure de prise en charge`
   *   **F1** : `Départ`
   *   **G1** : `Destination`
   *   **H1** : `Véhicule`
   *   **I1** : `Numéro de vol`
   *   **J1** : `Notes`
---

## ⚙️ Étape 2 : Configurer le script automatique (Google Apps Script)
1. Dans votre fichier Google Sheet, cliquez sur le menu **Extensions** tout en haut, puis sélectionnez **Apps Script**.
2. Effacez tout le code existant dans la zone d'édition.
3. Copiez et collez le script ci-dessous :

```javascript
function doPost(e) {
  try {
    // Ouvrir la feuille de calcul active
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Parser les données reçues en JSON
    var data = JSON.parse(e.postData.contents);
    
    // Insérer une nouvelle ligne avec les informations
    sheet.appendRow([
      data.timestamp,
      data.nom,
      data.email,
      data.telephone,
      data.datePriseEnCharge,
      data.depart,
      data.destination,
      data.vehicule,
      data.vol,
      data.notes
    ]);
    
    // Retourner une réponse de succès
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (error) {
    // En cas d'erreur, renvoyer les détails
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Cliquez sur la disquette en haut pour **Enregistrer le projet**.

---

## 🚀 Étape 3 : Déployer le script en tant que "Web App"
Pour que votre site web puisse envoyer des données à ce script, vous devez le rendre public en tant que Web App :

1. En haut à droite de l'écran Apps Script, cliquez sur le bouton bleu **Déployer**, puis sélectionnez **Nouveau déploiement**.
2. Dans la fenêtre qui s'ouvre, cliquez sur l'icône de l'engrenage à côté de "Sélectionner le type" et choisissez **Application Web**.
3. Configurez les options suivantes :
   *   **Description** : `Pont API de réservation SwiftRide`
   *   **Exécuter en tant que** : `Moi (votre_adresse@email.com)`
   *   **Qui a accès** : **`Tout le monde`** *(TRÈS IMPORTANT, sinon le site ne pourra pas écrire les données)*.
4. Cliquez sur **Déployer**.
5. Google vous demandera d'**Autoriser l'accès**. Cliquez sur "Autoriser l'accès", puis connectez-vous avec votre compte Google. Si un écran d'avertissement s'affiche ("Google n'a pas validé cette application"), cliquez sur **Paramètres avancés** (en bas à gauche), puis sur **Accéder à Projet sans titre (non sécurisé)** pour finaliser l'autorisation.
6. Une fois le déploiement terminé, copiez l'**URL de l'application web** fournie (Elle commence par `https://script.google.com/macros/s/...`).

---

## 🔗 Étape 4 : Lier l'URL à votre site
1. Ouvrez le fichier **[app.js](file:///c:/Users/yahya/OneDrive/Bureau/siwftride/app.js)** situé dans votre espace de travail.
2. À la ligne **289**, localisez la variable suivante :
   ```javascript
   const GOOGLE_SHEET_WEBAPP_URL = "";
   ```
3. Collez l'URL de l'application web que vous avez copiée entre les guillemets. Par exemple :
   ```javascript
   const GOOGLE_SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz...votre_identifiant_unique.../exec";
   ```
4. Enregistrez le fichier **app.js**.

C'est tout ! Votre site est maintenant connecté en direct à votre Google Sheet. Vous pouvez faire un test en remplissant le formulaire sur votre site : les informations s'ajouteront automatiquement dans votre feuille de calcul !
