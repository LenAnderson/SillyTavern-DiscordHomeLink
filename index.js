import { getRequestHeaders } from '../../../../script.js';
import { showLoader } from '../../../loader.js';
import { POPUP_RESULT, POPUP_TYPE, Popup } from '../../../popup.js';
import { executeSlashCommands, registerSlashCommand } from '../../../slash-commands.js';
import { currentUser } from '../../../user.js';
import { delay } from '../../../utils.js';

// ----------------- COPIED BECAUSE NOT EXPORTED --------------------------------
/**
 * Attempts to log in the user.
 * @param {string} handle User's handle
 * @param {string} password User's password
 * @returns {Promise<{ success:boolean, error:object}>}
 */
async function performLogin(handle, password) {
    const userInfo = {
        handle: handle,
        password: password,
    };

    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(userInfo),
        });

        if (!response.ok) {
            const errorData = await response.json();
            // return displayError(errorData.error || 'An error occurred');
            return { success:false, error:errorData.error };
        }

        const data = await response.json();

        if (data.handle) {
            console.log(`Successfully logged in as ${handle}!`);
            redirectToHome();
            return { success:true, error:null };
        }
    } catch (error) {
        console.error('Error logging in:', error);
        // displayError(String(error));
        return { success:false, error: error };
    }
}
/**
 * Redirects the user to the home page.
 * Preserves the query string.
 */
function redirectToHome() {
    window.location.href = '/' + window.location.search;
}
/**
 * Gets a list of users from the server.
 * @returns {Promise<object>} List of users
 */
async function getUserList() {
    const response = await fetch('/api/users/list', {
        method: 'POST',
        headers: getRequestHeaders(),
    });

    if (!response.ok) {
        const errorData = await response.json();
        // return displayError(errorData.error || 'An error occurred');
        return;
    }

    if (response.status === 204) {
        // discreetLogin = true;
        return [];
    }

    const userListObj = await response.json();
    console.log(userListObj);
    return userListObj;
}
// ----------------- END OF: COPIED BECAUSE NOT EXPORTED ------------------------




const switchUser = async(name)=>{
    const users = await getUserList();
    const u = users.find(it=>it.handle.toLowerCase() == name.toLowerCase() || it.name.toLowerCase() == name.toLowerCase());
    if (!u) {
        toastr.error(`No user "${name}"`);
        return;
    }
    let pass = '';
    if (u.password) {
        const dlg = new Popup(`<h3>${u.name}<h3><h4>Password:</h4>`, POPUP_TYPE.INPUT, '');
        await dlg.show();
        if (dlg.result !== POPUP_RESULT.AFFIRMATIVE) return;
        pass = dlg.value;
    }
    const result = await performLogin(u.handle, pass);
    if (!result.success) {
        toastr.error(result.error);
    }
};
const logout = async()=>{
    document.querySelector('#logout_button').click();
};
const restart = async()=>{
    toastr.info('Restarting SillyTavern');
    showLoader();
    await fetch('/api/plugins/process/restart');
    await delay(1000);
    while (!(await fetch('/', { method:'HEAD' })).ok) await delay(100);
    location.reload();
};
const shutdown = async()=>{
    toastr.info('Shutting down SillyTavern');
    await fetch('/api/plugins/process/exit');
    try {
        window.close();
    } catch {
        const dlg = new Popup('<h3>Close SillyTavern Client</h3>', POPUP_TYPE.TEXT);
        dlg.ok.addEventListener('click', ()=>window.close());
        await dlg.show();
    }
};
const goHome = async()=>{
    executeSlashCommands('/closechat');
};


let hasProcessPlugin = (await fetch('/api/plugins/process/', { method:'HEAD' })).ok;


registerSlashCommand('account',
    (args, value)=>switchUser(value),
    [],
    '<span class="monospace">(username)</span> – Sign out of the current account and into the given account.',
    true,
    true,
);
registerSlashCommand('logout',
    (args, value)=>logout(),
    [],
    '<span class="monospace"></span> – Sign out of the current account and return to the login page.',
    true,
    true,
);
if (hasProcessPlugin) {
    registerSlashCommand('restart',
        (args, value)=>restart(),
        [],
        '<span class="monospace"></span> – Restart SillyTavern server and reload client.',
        true,
        true,
    );
    registerSlashCommand('shutdown',
        (args, value)=>shutdown(),
        [],
        '<span class="monospace"></span> – Shut down SillyTavern server and close client.',
        true,
        true,
    );
}


let isDiscord = null;
let user;
let avatar;
/**@type {HTMLElement}*/
let trigger;

const clickListener = async(evt)=>{
    if (!isDiscord) return;
    executeSlashCommands('/closechat');
};

const contextListener = async(evt)=>{
    evt.preventDefault();
    const users = await getUserList();
    const ctx = document.createElement('div'); {
        ctx.classList.add('stdhl--ctxBlocker');
        ctx.title = '';
        ctx.addEventListener('click', (evt)=>{
            evt.stopPropagation();
            ctx.remove();
        });
        const list = document.createElement('ul'); {
            list.classList.add('stdhl--ctxMenu');
            list.classList.add('list-group');
            const rect = trigger.getBoundingClientRect();
            list.style.top = `${isDiscord ? rect.top : rect.bottom}px`;
            list.style.left = isDiscord ? 'var(--nav-bar-width)' : `${rect.left}px`;
            const homeItem = document.createElement('li'); {
                homeItem.classList.add('stdhl--ctxItem');
                homeItem.classList.add('stdhl--homeItem');
                homeItem.classList.add('list-group-item');
                homeItem.title = 'Return to landing page';
                homeItem.addEventListener('click', async()=>goHome());
                const ava = document.createElement('div'); {
                    ava.classList.add('stdhl--ctxAvatar');
                    ava.classList.add('stdhl--ctxIcon');
                    ava.classList.add('fa-solid', 'fa-home');
                    homeItem.append(ava);
                }
                const name = document.createElement('div'); {
                    name.classList.add('stdhl--ctxName');
                    name.textContent = 'Landing Page';
                    homeItem.append(name);
                }
                list.append(homeItem);
            }
            users.sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
            for (const u of users.filter(it=>it.handle != currentUser.handle)) {
                const item = document.createElement('li'); {
                    item.classList.add('stdhl--ctxItem');
                    item.classList.add('list-group-item');
                    item.setAttribute('data-stdhl--user', u.name);
                    item.title = `Switch to user "${u.name}"`;
                    item.addEventListener('click', async()=>switchUser(u.handle));
                    const ava = document.createElement('div'); {
                        ava.classList.add('stdhl--ctxAvatar');
                        ava.style.backgroundImage = `url(${u.avatar})`;
                        item.append(ava);
                    }
                    const name = document.createElement('div'); {
                        name.classList.add('stdhl--ctxName');
                        name.textContent = u.name;
                        item.append(name);
                    }
                    list.append(item);
                }
            }
            const logoutItem = document.createElement('li'); {
                logoutItem.classList.add('stdhl--ctxItem');
                logoutItem.classList.add('list-group-item');
                logoutItem.title = 'Logout and return to login screen';
                logoutItem.addEventListener('click', async()=>logout());
                const ava = document.createElement('div'); {
                    ava.classList.add('stdhl--ctxAvatar');
                    ava.classList.add('stdhl--ctxIcon');
                    ava.classList.add('fa-solid', 'fa-right-from-bracket');
                    logoutItem.append(ava);
                }
                const name = document.createElement('div'); {
                    name.classList.add('stdhl--ctxName');
                    name.textContent = 'Logout';
                    logoutItem.append(name);
                }
                list.append(logoutItem);
            }
            if (hasProcessPlugin) {
                const reloadItem = document.createElement('li'); {
                    reloadItem.classList.add('stdhl--ctxItem');
                    reloadItem.classList.add('list-group-item');
                    reloadItem.title = 'Restart SillyTavern server and reload client';
                    reloadItem.addEventListener('click', async()=>restart());
                    const ava = document.createElement('div'); {
                        ava.classList.add('stdhl--ctxAvatar');
                        ava.classList.add('stdhl--ctxIcon');
                        ava.classList.add('fa-solid', 'fa-rotate');
                        reloadItem.append(ava);
                    }
                    const name = document.createElement('div'); {
                        name.classList.add('stdhl--ctxName');
                        name.textContent = 'Restart';
                        reloadItem.append(name);
                    }
                    list.append(reloadItem);
                }
                const exitItem = document.createElement('li'); {
                    exitItem.classList.add('stdhl--ctxItem');
                    exitItem.classList.add('list-group-item');
                    exitItem.title = 'Shut down SillyTavern server and close client';
                    exitItem.addEventListener('click', async()=>shutdown());
                    const ava = document.createElement('div'); {
                        ava.classList.add('stdhl--ctxAvatar');
                        ava.classList.add('stdhl--ctxIcon');
                        ava.classList.add('fa-solid', 'fa-power-off');
                        exitItem.append(ava);
                    }
                    const name = document.createElement('div'); {
                        name.classList.add('stdhl--ctxName');
                        name.textContent = 'Shut Down';
                        exitItem.append(name);
                    }
                    list.append(exitItem);
                }
            }
            ctx.append(list);
        }
        document.body.append(ctx);
        trigger.append(ctx);
    }
};
const checkDiscord = async()=>{
    let newIsDiscord = window.getComputedStyle(document.body).getPropertyValue('--nav-bar-width') !== '';
    if (isDiscord != newIsDiscord) {
        isDiscord = newIsDiscord;
        user = currentUser.name;
        avatar = currentUser.avatar;
        document.body.classList[isDiscord ? 'add' : 'remove']('stdhl');
        document.body.classList[isDiscord ? 'remove' : 'add']('stdhl--nonDiscord');
        if (trigger) {
            trigger.removeEventListener('contextmenu', contextListener);
            trigger.removeEventListener('click', clickListener);
        }
        let hint;
        if (isDiscord) {
            trigger = document.querySelector('#top-bar');
            trigger.style.setProperty('--stdhl--iconSize', 'calc(var(--nav-bar-width) - 16px)');
            hint = 'Click to return to landing page\nRight-click to switch users, logout, restart server, or shutdown server';
            const sep = '–'.repeat(Math.min(50, Math.max(user.length,...hint.split('\n').map(it=>it.length))));
            trigger.title = `Current User: ${user}\n${sep}\n${hint}`;
            trigger.addEventListener('contextmenu', contextListener);
            trigger.addEventListener('click', clickListener);
        } else {
            trigger = document.querySelector('#user-settings-button > .drawer-toggle');
            trigger.style.setProperty('--stdhl--iconSize', 'calc(var(--topBarBlockSize))');
            hint = 'Right click to return to landing page, switch users, logout, restart server, or shutdown server';
            const sep = '–'.repeat(Math.min(50, Math.max(user.length,...hint.split('\n').map(it=>it.length))));
            trigger.title = `User Settings\n${sep}\nCurrent User: ${user}\n${sep}\n${hint}`;
            trigger.addEventListener('contextmenu', contextListener);
        }
        trigger.style.setProperty('--stdhl--avatar', `url(${avatar})`);
    }
    setTimeout(checkDiscord, 2000);
};
checkDiscord();
