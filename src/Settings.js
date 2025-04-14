import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';

export class Settings {
    /**@type {boolean} */
    separators = true;

    /**@type {string[]} */
    topBarList = [];

    dom = {
        /**@type {HTMLElement} */
        root: undefined,
        /**@type {{title:string, btn:HTMLElement, setting:HTMLElement}[]} */
        drawerList: [],
    };


    constructor() {
        Object.assign(this, extension_settings.discordHomeLink ?? {});
        document.body.classList[this.separators ? 'add' : 'remove']('stdhl--separators');
        this.render();
    }

    toJSON() {
        return {
            separators: this.separators,
            topBarList: this.topBarList,
        };
    }

    save() {
        extension_settings.discordHomeLink = this;
        saveSettingsDebounced();
    }



    renderTopBarSettings() {
        const tpl = /**@type {HTMLTemplateElement}*/(this.dom.root.querySelector('#stdhl--settings-topBarTemplate'));
        const btns = /**@type {HTMLElement[]}*/([...document.querySelectorAll('#top-settings-holder > .drawer:has(.drawer-toggle):has(.drawer-content)')]);
        for (const btn of btns) {
            if (this.dom.drawerList.find(it=>it.btn == btn)) continue;
            const title = /**@type {HTMLElement}*/(btn.querySelector('.drawer-icon[title], .drawer-toggle[title], [title]')).title;
            if (this.topBarList.includes(title)) {
                btn.classList.add('stdhl--isHidden');
            }
            const setting = /**@type {HTMLElement}*/(tpl.content.firstElementChild.cloneNode(true)); {
                setting.querySelector('.stdhl--primary').textContent = title.split('\n').shift();
                setting.querySelector('.stdhl--icon').classList.add(...[...btn.querySelector('.drawer-icon').classList].filter(it=>it.startsWith('fa-')));
                setting.dataset.title = title;
                const inp = setting.querySelector('input'); {
                    inp.checked = this.topBarList.includes(title);
                    inp.addEventListener('click', ()=>{
                        if (inp.checked && !this.topBarList.includes(title)) {
                            this.topBarList.push(title);
                            this.save();
                        } else if (!inp.checked && this.topBarList.includes(title)) {
                            this.topBarList.splice(this.topBarList.indexOf(title), 1);
                            this.save();
                        }
                        btn.classList[inp.checked ? 'add' : 'remove']('stdhl--isHidden');
                    });
                }
            }
            const after = this.dom.drawerList.find(it=>it.btn == btns.at(btns.indexOf(btn) + 1))?.setting;
            if (!after) {
                document.querySelector('#stdhl--settings-topBarWrapper').append(setting);
            } else {
                after.insertAdjacentElement('beforebegin', setting);
            }
            this.dom.drawerList.push({ title, btn, setting });
        }
    }

    async render() {
        if (document.querySelector('#stdhl--settings')) return;
        const url = '/scripts/extensions/third-party/SillyTavern-DiscordHomeLink/html/settings.html';
        const response = await fetch(url);
        if (!response.ok) {
            return console.warn('failed to fetch template:', url);
        }
        const settingsTpl = document.createRange().createContextualFragment(await response.text()).querySelector('#stdhl--settings');
        /**@type {HTMLElement} */
        const dom = /**@type {HTMLElement}*/(settingsTpl.cloneNode(true));
        this.dom.root = dom;
        document.querySelector('#extensions_settings').append(dom);

        {
            const cb = /**@type {HTMLInputElement}*/(dom.querySelector('#stdhl--separators'));
            cb.checked = this.separators;
            cb.addEventListener('input', ()=>{
                this.separators = cb.checked;
                document.body.classList[this.separators ? 'add' : 'remove']('stdhl--separators');
                this.save();
            });
        }

        this.renderTopBarSettings();
        const mo = new MutationObserver(()=>{
            this.renderTopBarSettings();
        });
        mo.observe(document.querySelector('#top-settings-holder'), { childList:true });
    }
}
