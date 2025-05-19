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
  }

  async uploadImage(event:any) {
    let file: any = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];

      const content = btoa(unescape(encodeURIComponent(atob(base64)))); // sécurisation encodage

      // upload vers assets/images/
      await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/${file.name}`, {
        message: `Ajout image ${file.name}`,
        content,
      }, {
        headers: {
          Authorization: `token ${this.token}`
        }
      });

      // upload vers docs/assets/images/
      await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/docs/${file.name}`, {
        message: `Ajout image ${file.name} (docs)`,
        content,
      }, {
        headers: {
          Authorization: `token ${this.token}`
        }
      });

      this.message = `${file.name} ajoutée avec succès.`;
      this.loadImages(); // recharger liste
    };

    reader.readAsDataURL(file);
  }

  async uploadImagePortfolio(event:any) {
    let file: any = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];

      const content = btoa(unescape(encodeURIComponent(atob(base64)))); // sécurisation encodage

      // upload vers assets/images/
      await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/portfolio/${file.name}`, {
        message: `Ajout image ${file.name}`,
        content,
      }, {
        headers: {
          Authorization: `token ${this.token}`
        }
      });

      // upload vers docs/assets/images/
      await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/docs/portfolio/${file.name}`, {
        message: `Ajout image ${file.name} (docs)`,
        content,
      }, {
        headers: {
          Authorization: `token ${this.token}`
        }
      });

      this.message = `${file.name} ajoutée avec succès.`;
      this.loadImages(); // recharger liste
    };

    reader.readAsDataURL(file);
  }

  async deleteImage(image: any) {
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