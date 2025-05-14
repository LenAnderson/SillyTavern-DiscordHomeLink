import { saveSettingsDebounced } from '../../../../../script.js';
import { extension_settings } from '../../../../extensions.js';
import { showFontAwesomePicker } from '../../../../utils.js';
import { trigger } from '../index.js';

export class Settings {
    /**@type {boolean} */
    separators = true;
    /**@type {'image'|'icon'} */
    homeIconType = 'image';
    /**@type {string} */
    homeIconImage = '/img/five.png';
    /**@type {string} */
    homeIconIcon = 'fa-home';

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
        document.body.setAttribute('data-stdhl--homeIconType', this.homeIconType);
        document.body.style.setProperty('--stdhl--iconUrl', `url('${encodeURI(this.homeIconImage)}')`);
        document.body.style.setProperty('--stdhl--icon', this.homeIconIcon);
        [...(trigger?.classList ?? [])]
            .filter(it=>it.startsWith('fa-') && !['fa-solid', 'fa-fw'].includes(it))
            .forEach(it=>trigger.classList.remove(it))
        ;
        trigger?.classList.add(this.homeIconIcon);
        this.render();
    }

    toJSON() {
        return {
            separators: this.separators,
            homeIconType: this.homeIconType,
            homeIconImage: this.homeIconImage,
            homeIconIcon: this.homeIconIcon,
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
            const cb = /**@type {HTMLInputElement}*/(dom.querySelector('#stdhl--homeIconImage'));
            cb.checked = this.homeIconType == 'image';
            cb.addEventListener('input', ()=>{
                this.homeIconType = 'image';
                document.body.setAttribute('data-stdhl--homeIconType', this.homeIconType);
                this.save();
            });
            const url = /**@type {HTMLInputElement}*/(dom.querySelector('#stdhl--homeIconImage-url'));
            url.value = this.homeIconImage;
            url.addEventListener('change', ()=>{
                this.homeIconImage = url.value;
                document.body.style.setProperty('--stdhl--iconUrl', `url('${encodeURI(this.homeIconImage)}')`);
            });
            /**@type {HTMLElement}*/(dom.querySelector('#stdhl--homeIconImage-icon')).style.setProperty('--image', this.homeIconImage);
        }
        {
            const cb = /**@type {HTMLInputElement}*/(dom.querySelector('#stdhl--homeIconIcon'));
            cb.checked = this.homeIconType == 'icon';
            cb.addEventListener('input', ()=>{
                this.homeIconType = 'icon';
                document.body.setAttribute('data-stdhl--homeIconType', this.homeIconType);
                this.save();
            });
            const icon = /**@type {HTMLElement}*/(dom.querySelector('#stdhl--homeIconIcon-icon'))
            icon.classList.add(this.homeIconIcon);
            dom.querySelector('#stdhl--homeIconIcon-picker').addEventListener('click', async()=>{
                const fa = await showFontAwesomePicker();
                if (fa) {
                    this.homeIconIcon = fa;
                    [...(trigger?.classList ?? [])]
                        .filter(it=>it.startsWith('fa-') && !['fa-solid', 'fa-fw'].includes(it))
                        .forEach(it=>trigger.classList.remove(it))
                    ;
                    trigger?.classList.add(this.homeIconIcon);
                    [...(icon?.classList ?? [])]
                        .filter(it=>it.startsWith('fa-') && !['fa-solid', 'fa-fw'].includes(it))
                        .forEach(it=>icon.classList.remove(it))
                    ;
                    icon?.classList.add(this.homeIconIcon);
                    this.save();
                }
            });
        }

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
