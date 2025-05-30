import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, isDevMode, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import axios from 'axios';
import * as DATA from '../../public/mockdata.json';
import { environment } from '../environements/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  token = '';
  owner = 'chiyanoyuuki';
  repo = 'CloeBeauty';
  path = 'README.md';
  content: any = '';
  selectedFile = '';
  shaMap: { [key: string]: string } = {};
  shaDocsMap: { [key: string]: string } = {};
  message = '';
  images: any = [];
  imagesPortfolio: any = [];
  loaded = false;
  keys: any;
  ddeploy = false;
  isLoading = false;
 loadingMessage = 'Mise à jour en cours...';
 imgModif = '';

  ngOnInit()
  {
    if(isDevMode())
    {
      this.token = '';
      this.loadImages();
    }
  }
  
  refreshKeys(){
    this.keys = Object.keys(this.content.trads.fr).filter(key => key in this.content.trads.en);
  }

  async loadSelectedFile() {
  try {
    // Charger le fichier racine
    const res = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/data.json`, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    this.content = decodeURIComponent(escape(atob(res.data.content)));
    this.content = JSON.parse(this.content);
    this.shaMap[0] = res.data.sha;

    this.message = `Fichier "${this.selectedFile}" chargé.`;

  } catch (err: any) {
    this.message = 'Erreur lors du chargement : ' + err.message;
  }
  this.refreshKeys();
}

  async updateGitData(nb:any) {
    this.isLoading = true;
    try {
      await this.delay(60000); // Laisser GitHub/CDN se mettre à jour
    } finally {
      this.isLoading = false;
      this.loadImages();
    }
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async saveSelectedFile() {

  const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(this.content))));

  const headers = {
    Authorization: `token ${this.token}`,
    Accept: 'application/vnd.github.v3+json'
  };

  const rootSha = await this.getSha('public/data.json');

  try {
    // Enregistrement fichier racine
     const rootRes = await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/data.json`, {
      message: `Mise à jour data`,
      content: contentEncoded,
      sha: rootSha 
    }, { headers });

  } catch (err: any) {
    this.message = 'Erreur à la sauvegarde : ' + err.message;
    console.error(err);
  }
}

  async getSha(path: string): Promise<string> {
    const headers = {
      Authorization: `token ${this.token}`,
      Accept: 'application/vnd.github.v3+json'
    };

    const res = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`, {
      headers
    });

    return res.data.sha;
  }

  extractNumericParts(filename: string): number[] {
    const baseName = filename.replace(/\.[^/.]+$/, ''); // retire l'extension
    return baseName.split('-').map(part => parseInt(part, 10));
  }

  async loadImages() {
    this.loadSelectedFile();
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
    this.images = this.images.sort((a:any,b:any)=>{
      const partsA = this.extractNumericParts(a.name);
      const partsB = this.extractNumericParts(b.name);

      for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const numA = partsA[i] ?? 0;
        const numB = partsB[i] ?? 0;
        if (numA !== numB) {
          return numA - numB;
        }
      }
      return 0;
    })
    let img = this.images.find((i:any)=>i.name == this.imgModif);
    if(img)
    {
      img.url = img.url + `?v=${Date.now()}`;
    }

    this.images = this.images.filter((img:any)=>img.name.includes(".png")||img.name.includes(".jpg")||img.name.includes(".jpeg"));

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

    this.imagesPortfolio = this.imagesPortfolio.filter((img:any)=>img.name.includes(".png")||img.name.includes(".jpg")||img.name.includes(".jpeg"));

    this.imagesPortfolio = this.imagesPortfolio.sort((a:any,b:any)=>{
      const partsA = this.extractNumericParts(a.name);
      const partsB = this.extractNumericParts(b.name);

      for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const numA = partsA[i] ?? 0;
        const numB = partsB[i] ?? 0;
        if (numA !== numB) {
          return numA - numB;
        }
      }
      return 0;
    })
    img = this.imagesPortfolio.find((i:any)=>i.name == this.imgModif);
    if(img)
    {
      img.url = img.url + `?v=${Date.now()}`;
    }

    if(this.images.length>0)this.loaded = true;
    this.imgModif = "";
  }

  async uploadImage($event: any) {
    let file: any = $event.target.files[0];
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = (reader.result as string).split(',')[1];
    const content = btoa(unescape(encodeURIComponent(atob(base64))));

    const filename = file.name;
    this.imgModif = filename;

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

    this.message = `Image "${filename}" uploadée avec succès (mise à jour si existante).`;
    this.updateGitData(30000);
  };

  reader.readAsDataURL(file);
  }

  async uploadImagePortfolio($event: any) {
    let file: any = $event.target.files[0];
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = (reader.result as string).split(',')[1];
    const content = base64;

    const filename = file.name;

    // Étape 1 : vérifier si l'image existe déjà
    let shaAssets = '';
    let shaDocs = '';
    try {
      const existing = await axios.get(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/portfolio/${filename}`, {
        headers: { Authorization: `token ${this.token}` }
      });
      shaAssets = existing.data.sha;
    } catch (err) {
      // image inexistante, c'est normal
    }

    if (shaAssets || shaDocs) {
      const overwrite = window.confirm(`L'image "${filename}" existe déjà. La remplacer ?`);
      if (!overwrite) return;
    }

    // Étape 2 : uploader ou remplacer
    await axios.put(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/public/portfolio/${filename}`, {
      message: shaAssets ? `Mise à jour image ${filename}` : `Ajout image ${filename}`,
      content,
      ...(shaAssets && { sha: shaAssets })
    }, {
      headers: { Authorization: `token ${this.token}` }
    });

    this.message = `Image "${filename}" uploadée avec succès (mise à jour si existante).`;
    this.updateGitData(30000);
  };

  reader.readAsDataURL(file);
  }

  async deleteImage(image: any) {
    const confirmed = window.confirm(`Supprimer l'image "${image.name}" ?`);
    if (!confirmed) return;

    await axios.delete(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${image.path}`, {
      data: {
        message: `Suppression ${image.name}`,
        sha: image.sha
      },
      headers: {
        Authorization: `token ${this.token}`
      }
    });

    this.message = `Image ${image.name} supprimée.`;
    this.updateGitData(5000);
  }
  
  getImg(img:any)
  {
    return this.images.find((i:any)=>i.name==img)?.url;
  }

  getUrl(url: string): string {
    return url + `?v=${Date.now()}`;
  }

  //topmenu
  addItem(nom:string) {
    if(nom=="topmenu")
      this.content.topmenu.push({ en: '', fr: '', active: true, temps: 0 });
    else if(nom=="galleries")
      this.content.galleries.push({ en: ['',''], fr: ['',''], img: '', click: '' });
    else if(nom=="lists")
      this.content.lists.push("");
    else if(nom=="fields")
      this.content.fields.push({model:"",required:false,nom:"",type:"input",placeholder:"",trad:"",placetrad:""});
    else if(nom=="listeavis")
      this.content.listeavis.push({nom:"",img:"",txt:"",trad:""});
    else if(nom=="services")
      this.content.services.push({nom:"",nom2:"",txt:"",txt2:""});
    else if(nom=="faq")
      this.content.faq.push({nom:"",nom2:"",questions:[]});
  }

  removeItem(nom:string, index: number, key:any = undefined) {
    if(!key)
      this.content[nom].splice(index, 1);
    else
    {
      delete this.content[nom].fr[key];
      delete this.content[nom].en[key];
      this.refreshKeys();
    }
  }

  async deploy() {
    this.ddeploy = true;
    try {
      const response = await axios.post('https://chiyanh.cluster031.hosting.ovh.net/deploy.php',);
      alert(response.data.success || 'Déploiement lancé !');
    } catch (err: any) {
      alert('Erreur : ' + (err.response?.data?.error || err.message));
    }
  }
}