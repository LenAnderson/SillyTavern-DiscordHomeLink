import { getRequestHeaders } from '../../../../script.js';
import { POPUP_RESULT, POPUP_TYPE, Popup } from '../../../popup.js';
import { executeSlashCommands } from '../../../slash-commands.js';
import { currentUser } from '../../../user.js';

// ----------------- COPIED BECAUSE NOT EXPORTED --------------------------------
/**
 * Gets a CSRF token from the server.
 * @returns {Promise<string>} CSRF token
 */
async function getCsrfToken() {
    const response = await fetch('/csrf-token');
    const data = await response.json();
    return data.token;
}
const csrfToken = await getCsrfToken();
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
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
            },
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
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
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




let isDiscord = false;
let user;
let avatar;
const checkDiscord = async()=>{
    let newIsDiscord = window.getComputedStyle(document.body).getPropertyValue('--nav-bar-width') !== '';
    if (isDiscord != newIsDiscord) {
        isDiscord = newIsDiscord;
        document.body.classList[isDiscord ? 'add' : 'remove']('stdhl');
        if (isDiscord && (user != currentUser.name || avatar != currentUser.avatar)) {
            user = currentUser.name;
            avatar = currentUser.avatar;
            /**@type {HTMLElement} */
            const topbar = document.querySelector('#top-bar');
            topbar.style.setProperty('--stdhl--avatar', `url(${avatar})`);
            const hint = 'Right-click to switch or logout';
            topbar.title = `${user}\n${'–'.repeat(Math.max(user.length,hint.length))}\n${hint}`;
            topbar.addEventListener('contextmenu', async(evt)=>{
                evt.preventDefault();
                const users = await getUserList();
                const ctx = document.createElement('div'); {
                    ctx.classList.add('stdhl--ctxBlocker');
                    ctx.addEventListener('click', (evt)=>{
                        evt.stopPropagation();
                        ctx.remove();
                    });
                    const list = document.createElement('ul'); {
                        list.classList.add('stdhl--ctxMenu');
                        list.classList.add('list-group');
                        const rect = topbar.getBoundingClientRect();
                        list.style.top = `${rect.top}px`;
                        users.sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
                        for (const u of users.filter(it=>it.handle != currentUser.handle)) {
                            const item = document.createElement('li'); {
                                item.classList.add('stdhl--ctxItem');
                                item.classList.add('list-group-item');
                                item.setAttribute('data-stdhl--user', u.name);
                                item.addEventListener('click', async()=>{
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
                                });
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
                            logoutItem.addEventListener('click', async()=>{
                                document.querySelector('#logout_button').click();
                            });
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
                        ctx.append(list);
                    }
                    document.body.append(ctx);
                    topbar.append(ctx);
                }
            });
        }
    }
    setTimeout(checkDiscord, 2000);
};
checkDiscord();

document.querySelector('#top-bar').addEventListener('click', ()=>{
    if (!isDiscord) return;
    executeSlashCommands('/closechat');
});
