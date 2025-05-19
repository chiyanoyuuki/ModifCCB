import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import axios from 'axios';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  token = '';
  owner = 'chiyanoyuuki';
  repo = 'CloeBeauty';
  path = 'README.md';
  content = '';
  editableFiles = ['i18n/trad.json',];
  selectedFile = '';
  shaMap: { [key: string]: string } = {};
  shaDocsMap: { [key: string]: string } = {};
  message = '';
  images: any = [];
  imagesPortfolio: any = [];
  loaded = false;

  async loadSelectedFile() {
  if (!this.selectedFile) return;

  try {
    // Charger le fichier racine
    const res = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/${this.selectedFile}`, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    this.content = decodeURIComponent(escape(atob(res.data.content)));
    this.shaMap[this.selectedFile] = res.data.sha;

    // Charger la version dans docs/
    const docsRes = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/docs/${this.selectedFile}`, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    this.shaDocsMap[this.selectedFile] = docsRes.data.sha;

    this.message = `Fichier "${this.selectedFile}" chargé.`;

  } catch (err: any) {
    this.message = 'Erreur lors du chargement : ' + err.message;
  }
}

  async saveSelectedFile() {
  const contentEncoded = btoa(unescape(encodeURIComponent(this.content)));
  const file = this.selectedFile;

  try {
    // Enregistrement fichier racine
    await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${file}`, {
      message: `Mise à jour ${file}`,
      content: contentEncoded,
      sha: this.shaMap[file]
    }, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    // Enregistrement docs/fichier
    await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/docs/${file}`, {
      message: `Mise à jour docs/${file}`,
      content: contentEncoded,
      sha: this.shaDocsMap[file]
    }, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    this.message = `Fichier "${file}" sauvegardé avec succès dans les deux emplacements.`;

  } catch (err: any) {
    this.message = 'Erreur à la sauvegarde : ' + err.message;
  }
}

  async loadImages() {
    const res = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/`, {
      headers: {
        Authorization: `token ${this.token}`,
      }
    });

    this.images = res.data.map((img: any) => ({
      name: img.name,
      path: img.path,
      sha: img.sha,
      url: img.download_url
    }));

    this.images = this.images.filter((img:any)=>img.name.includes(".png")||img.name.includes(".jpg"));

    const res2 = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/portfolio/`, {
      headers: {
        Authorization: `token ${this.token}`,
      }
    });

    this.imagesPortfolio = res2.data.map((img: any) => ({
      name: img.name,
      path: img.path,
      sha: img.sha,
      url: img.download_url
    }));

    this.imagesPortfolio = this.imagesPortfolio.filter((img:any)=>img.name.includes(".png")||img.name.includes(".jpg"));

    if(this.images.length>0)this.loaded = true;
  }

  async uploadImage($event: any) {
    let file: any = $event.target.files[0];
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = (reader.result as string).split(',')[1];
    const content = btoa(unescape(encodeURIComponent(atob(base64))));

    const filename = file.name;

    // Étape 1 : vérifier si l'image existe déjà
    let shaAssets = '';
    let shaDocs = '';
    try {
      const existing = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/${filename}`, {
        headers: { Authorization: `token ${this.token}` }
      });
      shaAssets = existing.data.sha;
    } catch (err) {
      // image inexistante, c'est normal
    }

    try {
      const existingDocs = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/docs/${filename}`, {
        headers: { Authorization: `token ${this.token}` }
      });
      shaDocs = existingDocs.data.sha;
    } catch (err) {
      // image inexistante, c'est normal
    }

    if (shaAssets || shaDocs) {
      const overwrite = window.confirm(`L'image "${filename}" existe déjà. La remplacer ?`);
      if (!overwrite) return;
    }

    // Étape 2 : uploader ou remplacer
    await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/${filename}`, {
      message: shaAssets ? `Mise à jour image ${filename}` : `Ajout image ${filename}`,
      content,
      ...(shaAssets && { sha: shaAssets })
    }, {
      headers: { Authorization: `token ${this.token}` }
    });

    await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/docs/${filename}`, {
      message: shaDocs ? `Mise à jour image ${filename} (docs)` : `Ajout image ${filename} (docs)`,
      content,
      ...(shaDocs && { sha: shaDocs })
    }, {
      headers: { Authorization: `token ${this.token}` }
    });

    this.message = `Image "${filename}" uploadée avec succès (mise à jour si existante).`;
    this.loadImages();
  };

  reader.readAsDataURL(file);
  }

  async uploadImagePortfolio($event: any) {
    let file: any = $event.target.files[0];
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = (reader.result as string).split(',')[1];
    const content = btoa(unescape(encodeURIComponent(atob(base64))));

    const filename = file.name;

    // Étape 1 : vérifier si l'image existe déjà
    let shaAssets = '';
    let shaDocs = '';
    try {
      const existing = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/portoflio/${filename}`, {
        headers: { Authorization: `token ${this.token}` }
      });
      shaAssets = existing.data.sha;
    } catch (err) {
      // image inexistante, c'est normal
    }

    try {
      const existingDocs = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/docs/portoflio/${filename}`, {
        headers: { Authorization: `token ${this.token}` }
      });
      shaDocs = existingDocs.data.sha;
    } catch (err) {
      // image inexistante, c'est normal
    }

    if (shaAssets || shaDocs) {
      const overwrite = window.confirm(`L'image "${filename}" existe déjà. La remplacer ?`);
      if (!overwrite) return;
    }

    // Étape 2 : uploader ou remplacer
    await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/portoflio/${filename}`, {
      message: shaAssets ? `Mise à jour image ${filename}` : `Ajout image ${filename}`,
      content,
      ...(shaAssets && { sha: shaAssets })
    }, {
      headers: { Authorization: `token ${this.token}` }
    });

    await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/docs/portoflio/${filename}`, {
      message: shaDocs ? `Mise à jour image ${filename} (docs)` : `Ajout image ${filename} (docs)`,
      content,
      ...(shaDocs && { sha: shaDocs })
    }, {
      headers: { Authorization: `token ${this.token}` }
    });

    this.message = `Image "${filename}" uploadée avec succès (mise à jour si existante).`;
    this.loadImages();
  };

  reader.readAsDataURL(file);
  }


  async deleteImage(image: any) {
    const confirmed = window.confirm(`Supprimer l'image "${image.name}" ?`);
    if (!confirmed) return;

    await axios.delete(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/${image.path}`, {
      data: {
        message: `Suppression ${image.name}`,
        sha: image.sha
      },
      headers: {
        Authorization: `token ${this.token}`
      }
    });

    // Supprimer dans docs/assets/images/
    await axios.delete(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/docs/${image.name}`, {
      data: {
        message: `Suppression ${image.name} (docs)`,
        sha: image.sha // si différent, tu dois récupérer le bon SHA
      },
      headers: {
        Authorization: `token ${this.token}`
      }
    });

    this.message = `Image ${image.name} supprimée.`;
    this.loadImages();
  }
}