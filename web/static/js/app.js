"use strict";(()=>{var l={async _req(e,t,s,a=6e4){let n=new AbortController,i=setTimeout(()=>n.abort(),a),r={method:e,headers:{"Content-Type":"application/json"},signal:n.signal};s!==void 0&&(r.body=JSON.stringify(s));try{let p=await fetch("/api"+t,r);clearTimeout(i);let d=p.status===204?null:await p.json().catch(()=>null);if(p.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!p.ok)throw new Error(d?.error||`HTTP ${p.status}`);return d}catch(p){throw clearTimeout(i),p}},get:e=>l._req("GET",e),post:(e,t)=>l._req("POST",e,t),put:(e,t)=>l._req("PUT",e,t),delete:e=>l._req("DELETE",e)};var F=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',x=e=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,B=(e,t)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${e}; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,E=e=>{let t={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[s,a]=t[e]||["stopped","Unknown"];return`<span class="kp-status kp-status-${s}">${a}</span>`},me=e=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[e]||"?",C=e=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET"})[e]||"?",$=()=>window.KP.user.role===window.KP.roles.admin,L=e=>{switch(e.SiteType){case 1:case 2:return`PHP ${me(e.PHPVersion)}`;case 4:return`Node ${{1:"20",2:"22",3:"23"}[e.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[e.RuntimeVersion]||"?"}`;default:return""}},T=e=>({id:e.id??e.ID,uname:e.uname??e.UName,uhash:e.uhash??e.UHash,fname:e.fname??e.FName,lname:e.lname??e.LName,email:e.email??e.Email,phone:e.phone??e.Phone,role:e.role??e.Role,totp_enabled:e.totp_enabled??!1,created:e.created??e.Created});function S(e,t){return new Promise(s=>{document.getElementById("kp-confirm-title").textContent=e,document.getElementById("kp-confirm-message").textContent=t;let a=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{a.hide(),s(!0)},{once:!0}),a.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>s(!1),{once:!0})})}function w(e,t){let s=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${e}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${t}</p>
                <p class="kp-muted">
                    This may take several minutes while images are pulled and containers are initialized.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s),UIkit.modal("#kp-progress-modal").show()}function f(){let e=document.getElementById("kp-progress-modal");e&&(UIkit.modal(e).hide(),setTimeout(()=>e.remove(),300))}var u={routes:{},register(e,t){this.routes[e]=t},async go(e,t={}){let s=Object.keys(t).length?e+"/"+Object.values(t).join("/"):e;window.location.hash=s,document.querySelectorAll(".kp-nav-link").forEach(i=>{i.classList.toggle("kp-active",i.dataset.view===e)});let a=this.routes[e];if(!a)return;let n=document.getElementById("kp-view");n.innerHTML=F();try{await a(n,t)}catch(i){n.innerHTML=x(i.message)}}};function A(){let t=(window.location.hash.replace("#","")||"dashboard").split("/"),s=t[0],a={};return s==="site-detail"&&t[1]&&(a.id=t[1]),{view:s,params:a}}var o={show(e,t="info",s=7e3){let a={success:"check",error:"warning",info:"info"},n=document.createElement("div");n.className=`kp-toast kp-toast-${t}`,n.innerHTML=`<span uk-icon="${a[t]||"info"}"></span><span>${e}</span>`,document.getElementById("kp-toasts").appendChild(n),UIkit.icon(n.querySelector("[uk-icon]")),setTimeout(()=>n.remove(),s)},success:e=>o.show(e,"success"),error:e=>o.show(e,"error"),info:e=>o.show(e,"info")};async function M(e){let t=`
        <div id="kp-edit-site-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit Site \u2014 ${e.Name}</h3>
                <form id="edit-site-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Name</label>
                            <input class="uk-input kp-input" name="name" type="text" value="${e.Name}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Type</label>
                            <select class="uk-select kp-select" name="site_type" id="es-site-type">
                                <option value="1" ${e.SiteType===1?"selected":""}>PHP</option>
                                <option value="3" ${e.SiteType===3?"selected":""}>Static HTML</option>
                                <option value="4" ${e.SiteType===4?"selected":""}>Node.js</option>
                                <option value="5" ${e.SiteType===5?"selected":""}>.NET</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s" id="es-php-version-wrap">
                            <label class="kp-label">PHP Version</label>
                            <select class="uk-select kp-select" name="php_version">
                                <option value="3" ${e.PHPVersion===3?"selected":""}>PHP 8.2</option>
                                <option value="4" ${e.PHPVersion===4?"selected":""}>PHP 8.3</option>
                                <option value="5" ${e.PHPVersion===5?"selected":""}>PHP 8.4</option>
                                <option value="6" ${e.PHPVersion===6?"selected":""}>PHP 8.5</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="es-node-version-wrap">
                            <label class="kp-label">Node.js Version</label>
                            <select class="uk-select kp-select" name="node_version">
                                <option value="1" ${e.RuntimeVersion===1?"selected":""}>Node 20 (LTS)</option>
                                <option value="2" ${e.RuntimeVersion===2?"selected":""}>Node 22 (LTS)</option>
                                <option value="3" ${e.RuntimeVersion===3?"selected":""}>Node 23</option>
                                <option value="4" ${e.RuntimeVersion===4?"selected":""}>Node 24</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="es-dotnet-version-wrap">
                            <label class="kp-label">.NET Version</label>
                            <select class="uk-select kp-select" name="dotnet_version">
                                <option value="1" ${e.RuntimeVersion===1?"selected":""}>.NET 8.0 (LTS)</option>
                                <option value="2" ${e.RuntimeVersion===2?"selected":""}>.NET 9.0</option>
                                <option value="3" ${e.RuntimeVersion===3?"selected":""}>.NET 10.0 (LTS)</option>
                            </select>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="es-start-command-wrap">
                            <label class="kp-label">Start Command</label>
                            <input class="uk-input kp-input" name="start_command" type="text" value="${e.StartCommand||""}">
                        </div>
                        <div class="uk-width-1-1 ${e.SiteType!==1?"uk-hidden":""}" id="es-wordpress-wrap">
                            <label><input class="uk-checkbox" type="checkbox" name="install_wordpress" checked> WordPress</label>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",t);let s=UIkit.modal("#kp-edit-site-modal"),a=document.getElementById("es-site-type"),n=document.getElementById("es-php-version-wrap"),i=document.getElementById("es-node-version-wrap"),r=document.getElementById("es-dotnet-version-wrap"),p=document.getElementById("es-start-command-wrap"),d=document.getElementById("es-wordpress-wrap");s.show();let c=v=>{n.classList.toggle("uk-hidden",v!==1&&v!==2),i.classList.toggle("uk-hidden",v!==4),r.classList.toggle("uk-hidden",v!==5),p.classList.toggle("uk-hidden",v!==4&&v!==5),d.classList.toggle("uk-hidden",v!==1)};c(e.SiteType),a.addEventListener("change",()=>c(parseInt(a.value))),document.getElementById("edit-site-form").addEventListener("submit",async v=>{v.preventDefault();let h=v.target.querySelector('[type="submit"]'),k=h.innerHTML;h.disabled=!0,h.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(v.target),m=parseInt(b.get("site_type")),g=null;m===4&&(g=parseInt(b.get("node_version"))),m===5&&(g=parseInt(b.get("dotnet_version")));let y={name:b.get("name").trim(),php_version:parseInt(b.get("php_version"))||3,site_type:m,runtime_version:g,start_command:b.get("start_command")?.trim()||""},ue=m===1?b.get("install_wordpress")==="on":!1;try{await l.put(`/sites/${e.ID}`,y),s.hide(),document.getElementById("kp-edit-site-modal")?.remove(),w("Applying Changes","Saving changes and recreating pod...");try{await l.post(`/sites/${e.ID}/recreate`,{install_wordpress:ue}),f(),o.success("Site updated and pod recreated")}catch(_){f(),o.error("Site saved but pod recreate failed: "+_.message)}u.go("site-detail",{id:String(e.ID)})}catch(_){o.error(_.message),h.disabled=!1,h.innerHTML=k}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function H(){document.body.insertAdjacentHTML("beforeend",`
        <div id="kp-create-site-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">New Site</h3>
                <form id="create-site-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Name</label>
                            <input class="uk-input kp-input" name="name" type="text" placeholder="mysite" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Type</label>
                            <select class="uk-select kp-select" name="site_type" id="cs-site-type">
                                <option value="1">PHP</option>
                                <option value="3">Static HTML</option>
                                <option value="4">Node.js</option>
                                <option value="5">.NET</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s" id="cs-php-version-wrap">
                            <label class="kp-label">PHP Version</label>
                            <select class="uk-select kp-select" name="php_version">
                                <option value="3" selected>PHP 8.2</option>
                                <option value="4">PHP 8.3</option>
                                <option value="5">PHP 8.4</option>
                                <option value="6">PHP 8.5</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="cs-node-version-wrap">
                            <label class="kp-label">Node.js Version</label>
                            <select class="uk-select kp-select" name="node_version">
                                <option value="1">Node 20 (LTS)</option>
                                <option value="2" selected>Node 22 (LTS)</option>
                                <option value="3">Node 23</option>
                                <option value="4">Node 24</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="cs-dotnet-version-wrap">
                            <label class="kp-label">.NET Version</label>
                            <select class="uk-select kp-select" name="dotnet_version">
                                <option value="1">.NET 8.0 (LTS)</option>
                                <option value="2">.NET 9.0</option>
                                <option value="3" selected>.NET 10.0 (LTS)</option>
                            </select>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="cs-start-command-wrap">
                            <label class="kp-label">Start Command</label>
                            <input class="uk-input kp-input" name="start_command" type="text" placeholder="node server.js or dotnet MyApp.dll">
                        </div>
                        <div class="uk-width-1-1" id="cs-wordpress-wrap">
                            <label><input class="uk-checkbox" type="checkbox" name="install_wordpress" checked> Install WordPress</label>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label">Domains (one per line)</label>
                            <textarea class="uk-textarea kp-textarea" name="domains" rows="3" placeholder="example.com&#10;www.example.com"></textarea>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="server"></span> Create Site
                        </button>
                    </div>
                </form>
            </div>
        </div>`);let t=UIkit.modal("#kp-create-site-modal"),s=document.getElementById("cs-site-type"),a=document.getElementById("cs-php-version-wrap"),n=document.getElementById("cs-node-version-wrap"),i=document.getElementById("cs-dotnet-version-wrap"),r=document.getElementById("cs-start-command-wrap"),p=document.getElementById("cs-wordpress-wrap");t.show(),s.addEventListener("change",()=>{let d=parseInt(s.value);a.classList.toggle("uk-hidden",d!==1&&d!==2),n.classList.toggle("uk-hidden",d!==4),i.classList.toggle("uk-hidden",d!==5),r.classList.toggle("uk-hidden",d!==4&&d!==5),p.classList.toggle("uk-hidden",d!==1)}),document.getElementById("create-site-form").addEventListener("submit",async d=>{d.preventDefault();let c=d.target.querySelector('[type="submit"]'),v=c.innerHTML;c.disabled=!0,c.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let h=new FormData(d.target),k=parseInt(h.get("site_type")),b=null;k===4&&(b=parseInt(h.get("node_version"))),k===5&&(b=parseInt(h.get("dotnet_version")));let m={name:h.get("name").trim(),php_version:parseInt(h.get("php_version"))||3,site_type:k,runtime_version:b,start_command:h.get("start_command")?.trim()||"",domains:h.get("domains").split(`
`).map(g=>g.trim()).filter(Boolean),install_wordpress:k===1?h.get("install_wordpress")==="on":!1};t.hide(),document.getElementById("kp-create-site-modal")?.remove(),w("Creating Site",`Setting up '${m.name}' \u2014 pulling images and provisioning containers...`);try{await l.post("/sites",m),f(),o.success(`Site '${m.name}' created`),u.go("sites")}catch(g){f(),o.error(g.message),c.disabled=!1,c.innerHTML=v}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}async function z(e){let t=await l.get("/sites")??[];e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn">
                <span uk-icon="plus"></span> New Site
            </button>
        </div>
        <div class="kp-site-grid">
            ${t.length===0?B("world","No sites yet \u2014 create one to get started"):t.map(j).join("")}
        </div>`,document.getElementById("sites-new-btn").addEventListener("click",()=>H())}function j(e){let t=e.Domains?.[0]??null;return`
        <div class="kp-site-card" data-site-id="${e.ID}" data-status="${e.SiteStatus}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${e.ID}">${e.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${e.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${C(e.SiteType)}${L(e)?" / "+L(e):""}</span>
                        ${t?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${t}" target="_blank" style="color:var(--kp-cyan)">${t}</a></span>`:""}
                    </div>
                </div>
                ${E(e.SiteStatus)}
            </div>
            <div class="kp-site-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="manage" data-id="${e.ID}" uk-tooltip="Manage This Site"><span uk-icon="icon: settings;"></span></button>
                ${e.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="stop" data-id="${e.ID}" uk-tooltip="Stop the Site"><span uk-icon="icon: ban;"></span></button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="start" data-id="${e.ID}" uk-tooltip="Start the Site"><span uk-icon="icon: play;"></span></button>`}
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="restart" data-id="${e.ID}" uk-tooltip="Restart the Site"><span uk-icon="icon: refresh;"></span></button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="flush" data-id="${e.ID}" title="Flush cache" uk-tooltip="Flush the Caches"><span uk-icon="icon: bolt;"></span></button>
                <div class="kp-site-actions-break"></div>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="recreate" data-id="${e.ID}" title="Recreate pod" uk-tooltip="Recreate the Pod"><span uk-icon="icon: history;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit" data-id="${e.ID}" title="Edit" uk-tooltip="Edit the Site"><span uk-icon="icon: pencil;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${e.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`}async function Q(e){let t=await l.get("/sites")??[],s=t.filter(i=>i.SiteStatus===1).length,a=t.filter(i=>i.SiteStatus===2).length,n=t.filter(i=>i.SiteStatus===4).length;e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Dashboard</h1>
        </div>
        <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-medium-bottom" uk-grid>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value">${t.length}</div>
                            <div class="kp-stat-label">Total Sites</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: world; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-success)">${s}</div>
                            <div class="kp-stat-label">Running</div>
                        </div>
                        <span style="color:var(--kp-success)" uk-icon="icon: check; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-text-dim)">${a}</div>
                            <div class="kp-stat-label">Stopped</div>
                        </div>
                        <span style="color:var(--kp-text-dim)" uk-icon="icon: ban; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-danger)">${n}</div>
                            <div class="kp-stat-label">Errors</div>
                        </div>
                        <span style="color:var(--kp-danger)" uk-icon="icon: warning; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
        </div>
        <div class="kp-view-header">
            <h2 class="kp-view-title" style="font-size:1.25rem">Recent Sites</h2>
            <button class="uk-button kp-btn-primary" id="dash-new-site">
                <span uk-icon="plus"></span> New Site
            </button>
        </div>
        <div class="kp-site-grid">
            ${t.length===0?B("world","No sites yet"):t.slice(0,6).map(j).join("")}
        </div>`,document.getElementById("dash-new-site")?.addEventListener("click",()=>H())}function q(e=null){let t=e?`/sites/${e}/security/ip`:"/security/ip",s=e?`/sites/${e}/security/ua`:"/security/ua";return`
        <div id="security-panel" data-ip-base="${t}" data-ua-base="${s}">

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">IP Rules</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ip-save">
                        <span uk-icon="check"></span> Save IP Rules
                    </button>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One IP address or CIDR block per line (e.g. <span class="kp-mono">1.2.3.4</span>
                    or <span class="kp-mono">10.0.0.0/8</span>).
                    Blacklist always wins \u2014 a blacklisted IP cannot be whitelisted.
                    Whitelist is disabled when empty.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ip-whitelist" rows="6"
                            placeholder="# allow only these IPs&#10;1.2.3.4&#10;10.0.0.0/8"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ip-blacklist" rows="6"
                            placeholder="# block these IPs&#10;5.6.7.8&#10;192.168.99.0/24"></textarea>
                    </div>
                </div>
            </div>

            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">User-Agent Rules</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ua-save">
                        <span uk-icon="check"></span> Save UA Rules
                    </button>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One substring per line \u2014 matched case-insensitively against the full User-Agent header.
                    Blacklist always wins. Whitelist is disabled when empty.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ua-whitelist" rows="6"
                            placeholder="# allow only these agents&#10;mozilla&#10;googlebot"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ua-blacklist" rows="6"
                            placeholder="# block these agents&#10;sqlmap&#10;nikto&#10;masscan"></textarea>
                    </div>
                </div>
            </div>

        </div>`}async function D(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,a=t.dataset.uaBase;try{let[n,i]=await Promise.all([l.get(s),l.get(a)]);e.querySelector("#sec-ip-whitelist").value=n.whitelist??"",e.querySelector("#sec-ip-blacklist").value=n.blacklist??"",e.querySelector("#sec-ua-whitelist").value=i.whitelist??"",e.querySelector("#sec-ua-blacklist").value=i.blacklist??""}catch(n){o.error("Failed to load security rules: "+n.message)}}function R(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,a=t.dataset.uaBase;e.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let n=e.querySelector("#sec-ip-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await l.put(s,{whitelist:e.querySelector("#sec-ip-whitelist").value,blacklist:e.querySelector("#sec-ip-blacklist").value}),o.success("IP rules saved")}catch(r){o.error(r.message)}finally{n.disabled=!1,n.innerHTML=i}}),e.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let n=e.querySelector("#sec-ua-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await l.put(a,{whitelist:e.querySelector("#sec-ua-whitelist").value,blacklist:e.querySelector("#sec-ua-blacklist").value}),o.success("UA rules saved")}catch(r){o.error(r.message)}finally{n.disabled=!1,n.innerHTML=i}})}async function G(e){if(!$()){e.innerHTML=x("Access denied");return}e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 a blacklisted entry cannot be overridden by any whitelist.
        </p>
        ${q(null)}`,R(e),D(e)}function ke(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function K(e){let t=document.getElementById("admin-domain-ssl");if(!(!t||!e))try{let s=await l.get(`/ssl-status?domain=${encodeURIComponent(e)}`);t.outerHTML=ke(s.status)}catch{}}async function J(e){if(!$()){e.innerHTML=x("Access denied");return}let t=await l.get("/settings");e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Settings</h1>
        </div>
        <div class="kp-card uk-padding kp-settings-wrap">
            <h3 class="kp-view-title uk-margin-bottom">Panel Configuration</h3>
            <form id="settings-form" class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="kp-label" for="admin-domain">Management UI Domain</label>
                    <div class="uk-flex kp-settings-domain-wrap">
                        <span id="admin-domain-ssl" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
                        <input
                            class="uk-input kp-input"
                            id="admin-domain"
                            name="admin_domain"
                            type="text"
                            placeholder="panel.example.com"
                            value="${t.admin_domain??""}">
                    </div>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        When set, the proxy will route this domain to the management UI and issue
                        a Let's Encrypt certificate automatically. Leave blank to disable.
                    </p>
                </div>
                <div class="uk-flex uk-flex-right uk-margin-top">
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save Settings
                    </button>
                </div>
            </form>
        </div>
        `,t.admin_domain&&K(t.admin_domain),document.getElementById("settings-form").addEventListener("submit",async s=>{s.preventDefault();let a=s.target.querySelector('[type="submit"]'),n=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let r={admin_domain:new FormData(s.target).get("admin_domain").trim()};try{await l.put("/settings",r),o.success("Settings saved"),K(r.admin_domain)}catch(p){o.error(p.message)}finally{a.disabled=!1,a.innerHTML=n}})}var O={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis"};function I(e,t,s){let a=s?Object.entries(s):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <span class="kp-muted uk-text-small">${a.length} configuration keys</span>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="${t}">
                        <span uk-icon="plus"></span> Add Key
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="${t}" data-site="${e}">
                        <span uk-icon="check"></span> Save
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="${t}" data-site="${e}">
                        <span uk-icon="refresh"></span> Reset
                    </button>
                </div>
            </div>
            <div class="kp-config-grid cfg-rows" data-type="${t}">
                ${a.map(([n,i])=>W(n,i)).join("")}
            </div>
        </div>`}function W(e="",t=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${e}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${t}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function Y(e,t){e.addEventListener("click",s=>{if(s.target.closest(".cfg-add-row")){let a=s.target.closest(".cfg-add-row");e.querySelector(`.cfg-rows[data-type="${a.dataset.type}"]`).insertAdjacentHTML("beforeend",W())}}),e.addEventListener("click",s=>{s.target.closest(".cfg-del-row")&&s.target.closest(".kp-config-row").remove()}),e.addEventListener("click",async s=>{let a=s.target.closest(".cfg-save");if(!a)return;let{type:n,site:i}=a.dataset,r=e.querySelectorAll(`.cfg-rows[data-type="${n}"] .kp-config-row`),p={};r.forEach(d=>{let c=d.querySelector(".cfg-key").value.trim(),v=d.querySelector(".cfg-val").value.trim();c&&(p[c]=v)});try{await l.put(`/sites/${i}/configs/${n}`,p),o.success(`${O[n]} config saved`)}catch(d){o.error(d.message)}}),e.addEventListener("click",async s=>{let a=s.target.closest(".cfg-reset");if(!a)return;let{type:n,site:i}=a.dataset;if(await S("Reset Config",`Reset ${O[n]} config to defaults?`))try{let p=await l.post(`/sites/${i}/configs/${n}/reset`),d=e.querySelector(`.cfg-rows[data-type="${n}"]`);d.innerHTML=Object.entries(p).map(([c,v])=>W(c,v)).join(""),o.success(`${O[n]} reset to defaults`)}catch(p){o.error(p.message)}})}function X(e,t){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    <option value="nginx">Nginx</option>
                    ${(()=>{switch(t){case 1:case 2:return'<option value="php">PHP-FPM</option>';case 4:return'<option value="app">Node.js</option>';case 5:return'<option value="app">.NET</option>';default:return""}})()}
                    <option value="db">MariaDB</option>
                    <option value="redis">Redis</option>
                </select>
                <select class="uk-select kp-select" id="log-tail" style="width:120px;height:38px">
                    <option value="100">100 lines</option>
                    <option value="250">250 lines</option>
                    <option value="500">500 lines</option>
                    <option value="1000">1000 lines</option>
                </select>
                <button class="uk-button kp-btn-secondary kp-btn-sm" id="log-connect">
                    <span uk-icon="play"></span> Connect
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="log-disconnect" disabled>
                    <span uk-icon="ban"></span> Disconnect
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="log-clear">
                    <span uk-icon="trash"></span> Clear
                </button>
                <label style="font-size:0.82rem;color:var(--kp-text-dim);display:flex;align-items:center;gap:6px">
                    <input type="checkbox" class="uk-checkbox" id="log-autoscroll" checked>
                    Auto-scroll
                </label>
            </div>
            <div class="kp-log-header">
                <div class="kp-log-dot kp-log-dot-red"></div>
                <div class="kp-log-dot kp-log-dot-yellow"></div>
                <div class="kp-log-dot kp-log-dot-green"></div>
                <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="log-status">Disconnected</span>
            </div>
            <div class="kp-log-wrap" id="log-output"></div>
        </div>`}function Z(e,t){let s=null,a=!1,n=e.querySelector("#log-output"),i=e.querySelector("#log-connect"),r=e.querySelector("#log-disconnect"),p=e.querySelector("#log-clear"),d=e.querySelector("#log-autoscroll"),c=e.querySelector("#log-status");function v(b){b.split(`
`).forEach(m=>{if(!m)return;let g=document.createElement("div");g.className=m.match(/error|crit|emerg/i)?"kp-log-line-err":m.match(/warn/i)?"kp-log-line-warn":m.match(/info|notice/i)?"kp-log-line-info":"",g.textContent=m,n.appendChild(g)}),d.checked&&(n.scrollTop=n.scrollHeight)}function h(){s&&(s.close(),s=null),a=!1,i.disabled=!1,r.disabled=!0,c&&(c.textContent="Disconnected")}i.addEventListener("click",()=>{h();let b=e.querySelector("#log-container").value,m=e.querySelector("#log-tail").value,g=location.protocol==="https:"?"wss":"ws";s=new WebSocket(`${g}://${location.host}/api/sites/${t}/logs?container=${b}&tail=${m}`),s.onopen=()=>{a=!0,i.disabled=!0,r.disabled=!1,c&&(c.textContent=`Connected \u2014 ${b}`)},s.onmessage=y=>v(y.data),s.onerror=()=>{},s.onclose=()=>{a=!1,i.disabled=!1,r.disabled=!0,c&&(c.textContent="Disconnected")}}),r.addEventListener("click",h),p.addEventListener("click",()=>{n.innerHTML=""}),e.querySelector("#log-container").addEventListener("change",()=>{s&&s.readyState===WebSocket.OPEN&&(h(),i.click())});let k=u.go.bind(u);u.go=function(b,m={}){return s&&h(),k(b,m)}}function be(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function ee(e,t){try{let s=await l.get(`/ssl-status?domain=${encodeURIComponent(e)}`),a=document.getElementById(`ssl-icon-${t}`);a&&(a.outerHTML=be(s.status))}catch{}}function te(e){e.forEach(t=>ee(t.Domain,t.ID))}function se(e,t,s){let a=e.SiteType!==3&&e.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${e.Name}</td></tr>
                            <tr><td class="kp-muted">Port</td><td>:${e.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${C(e.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${L(e)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${E(e.SiteStatus)}</td></tr>
                            <tr><td class="kp-muted">Created</td><td>${new Date(e.Created).toLocaleString()}</td></tr>
                        </tbody>
                    </table>
                </div>

                ${a?`
                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">phpMyAdmin</h3>
                    <p class="kp-muted uk-text-small uk-margin-remove-bottom">
                        Opens a secure time-limited session. Link expires after 10 minutes or first use.
                    </p>
                    <div class="uk-margin-small-top">
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="pma-open-btn">
                            <span uk-icon="database"></span> Open phpMyAdmin
                        </button>
                    </div>
                </div>`:""}
            </div>

            <div class="uk-width-1-2@m">

                <div class="kp-card uk-padding-small">
                    <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                        <h3 class="kp-view-title uk-margin-bottom">Domains</h3>
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="domain-add-btn">
                            <span uk-icon="plus"></span> Add
                        </button>
                    </div>
                    <div id="domain-list">
                        ${t.length?t.map(ae).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
                    </div>
                    <div id="domain-add-form" class="uk-hidden uk-margin-small-top">
                        <div class="uk-flex kp-domain-add-wrap">
                            <input class="uk-input kp-input kp-input-sm" id="domain-add-input" type="text" placeholder="example.com">
                            <button class="uk-button kp-btn-primary kp-btn-sm" id="domain-save-btn">Add</button>
                            <button class="uk-button kp-btn-ghost kp-btn-sm" id="domain-cancel-btn">Cancel</button>
                        </div>
                    </div>
                </div>

                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">SFTP Access</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Host</td><td class="kp-mono">${location.hostname}</td></tr>
                            <tr><td class="kp-muted">Port</td><td class="kp-mono">2222</td></tr>
                            <tr><td class="kp-muted">User</td><td class="kp-mono">${s?.Username??e.Name}</td></tr>
                            <tr>
                                <td class="kp-muted">Password</td>
                                <td>
                                    <span id="sftp-pass-display" class="kp-mono kp-sftp-pass">${s?.Password??"\u2014"}</span>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left" id="sftp-copy-btn" uk-tooltip="Copy the Password">
                                        <span uk-icon="icon: copy; ratio: 0.75"></span>
                                    </button>
                                </td>
                            </tr>
                            <tr><td class="kp-muted">Path</td><td class="kp-mono">/html</td></tr>
                        </tbody>
                    </table>
                    <div class="uk-margin-small-top">
                        <button class="uk-button kp-btn-ghost kp-btn-sm" id="sftp-regen-btn">
                            <span uk-icon="refresh"></span> Regenerate Password
                        </button>
                    </div>
                </div>

            </div>
        </div>`}function ae(e){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${e.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${e.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${e.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${e.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function ne(e,t){e.querySelector("#domain-add-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.remove("uk-hidden")}),e.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.add("uk-hidden")}),e.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#domain-add-input").value.trim();if(s)try{let a=await l.post(`/sites/${t}/domains`,{domain:s});e.querySelector("#domain-list").insertAdjacentHTML("beforeend",ae(a)),ee(a.Domain,a.ID),e.querySelector("#domain-add-form").classList.add("uk-hidden"),e.querySelector("#domain-add-input").value="",o.success("Domain added")}catch(a){o.error(a.message)}}),e.querySelector("#domain-list")?.addEventListener("click",async s=>{let a=s.target.closest('[data-action="delete-domain"]');if(!(!a||!await S("Remove Domain","Remove this domain from the site?")))try{await l.delete(`/sites/${t}/domains/${a.dataset.did}`),a.closest("[data-domain-id]").remove(),o.success("Domain removed")}catch(i){o.error(i.message)}})}function ie(e,t){e.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#sftp-regen-btn"),a=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await l.post(`/sites/${t}/sftp-regen`),o.success("SFTP password regenerated"),u.go("site-detail",{id:String(t)})}catch(n){o.error(n.message),s.disabled=!1,s.innerHTML=a}}),e.querySelector("#sftp-copy-btn")?.addEventListener("click",()=>{let s=e.querySelector("#sftp-pass-display")?.textContent;if(s)if(navigator.clipboard)navigator.clipboard.writeText(s).then(()=>o.success("Password copied to clipboard")).catch(()=>o.error("Failed to copy password"));else{let a=document.createElement("textarea");a.value=s,a.style.cssText="position:fixed;opacity:0",document.body.appendChild(a),a.select(),document.execCommand("copy"),document.body.removeChild(a),o.success("Password copied to clipboard")}}),e.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#pma-open-btn"),a=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let n=await l.post(`/sites/${t}/pma-token`);window.open(n.url,"_blank")}catch(n){o.error(n.message)}finally{s.disabled=!1,s.innerHTML=a}})}var ve=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function oe(e){return`
        <div>
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${ve.map(t=>`
                   <button class="uk-button kp-btn-ghost kp-btn-sm"
                        data-action="wpcli-quick"
                        data-cmd="${t.cmd}">
                        ${t.label}
                    </button>`).join("")}
            </div>
            
            <p class="kp-muted uk-text-small uk-margin-small-top">
                <span uk-icon="icon: info; ratio: 0.75"></span>
                WP-CLI <span class="kp-mono">db</span> subcommands are not available \u2014 MariaDB client tools are only present in the database container.
            </p>

            <div class="uk-flex uk-flex-middle uk-margin-small-top" style="gap:8px">
                <span class="kp-mono" style="color:var(--kp-cyan);font-size:0.85rem;flex-shrink:0">wp&gt;</span>
                <input
                    class="uk-input kp-input"
                    id="wpcli-input"
                    type="text"
                    placeholder="plugin list --status=active"
                    style="height:38px;font-family:'JetBrains Mono',monospace;font-size:0.85rem"
                    autocomplete="off"
                    spellcheck="false">
                <button class="uk-button kp-btn-primary kp-btn-sm" id="wpcli-run">
                    <span uk-icon="play"></span> Run
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="wpcli-clear">
                    <span uk-icon="trash"></span> Clear
                </button>
            </div>

            <div class="kp-log-header uk-margin-small-top">
                <div class="kp-log-dot kp-log-dot-red"></div>
                <div class="kp-log-dot kp-log-dot-yellow"></div>
                <div class="kp-log-dot kp-log-dot-green"></div>
                <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="wpcli-status">Ready</span>
            </div>
            <div class="kp-log-wrap" id="wpcli-output" style="height:500px"></div>
        </div>`}function le(e,t){let s=e.querySelector("#wpcli-output"),a=e.querySelector("#wpcli-input"),n=e.querySelector("#wpcli-run"),i=e.querySelector("#wpcli-clear"),r=e.querySelector("#wpcli-status"),p=[],d=-1;function c(k,b=""){k.split(`
`).forEach(m=>{if(!m)return;let g=document.createElement("div");b?g.className=b:g.className=m.match(/error|fatal|critical/i)?"kp-log-line-err":m.match(/warning|warn/i)?"kp-log-line-warn":m.match(/success|done\]/i)?"kp-log-line-info":"",g.textContent=m,s.appendChild(g)}),s.scrollTop=s.scrollHeight}function v(k){if(k=k.trim(),!k)return;p.unshift(k),d=-1,c(`wp> ${k}`,"kp-log-line-info"),a.disabled=!0,n.disabled=!0,r&&(r.textContent="Running...");let b=location.protocol==="https:"?"wss":"ws",m=new WebSocket(`${b}://${location.host}/api/sites/${t}/wpcli`);m.onopen=()=>{m.send(JSON.stringify({command:k}))},m.onmessage=g=>{let y=g.data;if(y.trim()==="[done]"){m.close();return}if(y.startsWith("[info]")){c(y,"kp-muted");return}if(y.startsWith("[error]")){c(y,"kp-log-line-err");return}c(y)},m.onerror=()=>{c("[error] WebSocket connection failed","kp-log-line-err")},m.onclose=()=>{a.disabled=!1,n.disabled=!1,r&&(r.textContent="Ready"),a.focus()}}n.addEventListener("click",()=>{v(a.value),a.value=""}),a.addEventListener("keydown",k=>{if(k.key==="Enter"){v(a.value),a.value="",d=-1;return}if(k.key==="ArrowUp"){k.preventDefault(),d<p.length-1&&(d++,a.value=p[d]);return}k.key==="ArrowDown"&&(k.preventDefault(),d>0?(d--,a.value=p[d]):(d=-1,a.value=""))}),e.querySelectorAll('[data-action="wpcli-quick"]').forEach(k=>{k.addEventListener("click",()=>{let b=k.dataset.cmd;if(b.startsWith("search-replace")){a.value=b,a.focus();let m=b.indexOf("''")+1;a.setSelectionRange(m,m);return}v(b)})}),i.addEventListener("click",()=>{s.innerHTML=""});let h=u.go.bind(u);u.go=function(k,b={}){return h(k,b)},a.focus()}async function re(e,{id:t}){let{site:s,domains:a,sftp:n}=await l.get(`/sites/${t}`),i=await l.get(`/sites/${t}/configs`),r=s.SiteType===1||s.SiteType===2;e.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">${s.Name}</h1>
                ${E(s.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${t}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${t}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${t}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${t}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="update" data-id="${t}" uk-tooltip="Update the Pod Images"><span uk-icon="cloud-upload"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-recreate" uk-tooltip="Recreate the Pod"><span uk-icon="history"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>

        <ul uk-tab class="uk-margin-medium-bottom">
            <li><a href="#">Overview</a></li>
            <li><a href="#">Nginx</a></li>
            ${r?'<li><a href="#">PHP</a></li>':""}
            <li><a href="#">MariaDB</a></li>
            <li><a href="#">Redis</a></li>
            <li><a href="#">Logs</a></li>
            <li><a href="#">Security</a></li>
            ${s.SiteType===1?'<li><a href="#">WP-CLI</a></li>':""}
        </ul>

        <ul class="uk-switcher">
            <li>${se(s,a??[],n)}</li>
            <li>${I(t,1,i[1])}</li>
            ${r?`<li>${I(t,2,i[2])}</li>`:""}
            <li>${I(t,3,i[3])}</li>
            <li>${I(t,4,i[4])}</li>
            <li>${X(t,s.SiteType)}</li>
            <li>${q(t)}</li>
            ${s.SiteType===1?`<li>${oe(t)}</li>`:""}            
        </ul>`,document.getElementById("sd-back").addEventListener("click",()=>u.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>M(s)),document.getElementById("sd-recreate").addEventListener("click",async()=>{w("Recreating Pod","Recreating containers for this site...");try{await l.post(`/sites/${t}/recreate`),f(),o.success("Pod recreated"),u.go("site-detail",{id:t})}catch(p){f(),o.error(p.message)}}),Y(e,t),ne(e,t),Z(e,t),R(e),s.SiteType===1&&le(e,t),D(e),ie(e,t),te(a??[])}async function N(e){let t=document.getElementById("totp-qr-img"),s=document.getElementById("totp-qr-wrap");if(!t||!s)return;if(s.querySelectorAll(".totp-uri-text").forEach(n=>n.remove()),typeof QRCode<"u")try{let n=await new Promise((i,r)=>{QRCode.toDataURL(e,{width:220,margin:2},(p,d)=>{p?r(p):i(d)})});t.src=n,t.style.display="";return}catch{}let a=document.createElement("p");a.className="totp-uri-text kp-muted uk-text-small",a.style.wordBreak="break-all",a.textContent=e,s.appendChild(a)}function U(e){document.getElementById("kp-backup-codes-modal")?.remove();let s=`
        <div id="kp-backup-codes-modal" uk-modal="bg-close:false;esc-close:false">
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:480px">
                <h3 class="uk-modal-title" style="color:var(--kp-yellow,#f0b429)">
                    <span uk-icon="warning"></span>&nbsp;Save Your Backup Codes
                </h3>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    These codes let you access your account if you lose your authenticator.
                    Each code works <strong>once only</strong>. Keep them somewhere safe.
                </p>
                <div class="kp-backup-codes-grid uk-margin-small">${e.map(n=>`<code class="kp-backup-code">${n}</code>`).join("")}</div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    These codes will <strong>not</strong> be shown again.
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button id="kp-backup-copy-btn" class="uk-button kp-btn-ghost">Copy All</button>
                    <button id="kp-backup-done-btn" class="uk-button kp-btn-primary">I've Saved These</button>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s);let a=UIkit.modal("#kp-backup-codes-modal");a.show(),document.getElementById("kp-backup-copy-btn").addEventListener("click",()=>{let n=e.join(`
`),i=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(n).then(()=>{i.textContent="Copied!"});else{let r=document.createElement("textarea");r.value=n,r.style.cssText="position:fixed;opacity:0",document.body.appendChild(r),r.select();try{document.execCommand("copy"),i.textContent="Copied!"}catch{}r.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{a.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),u.go("users")})}function de(e){document.body.insertAdjacentHTML("beforeend",`
        <div id="kp-create-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">New User</h3>
                <form id="create-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" required>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel">
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Password</label>
                            <input class="uk-input kp-input" name="password" type="password" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50">Manager</option>
                                <option value="99">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Create User</button>
                    </div>
                </form>

                <div id="cu-totp-section" style="display:none">
                    <hr class="uk-divider-muted uk-margin-top">
                    <h4 class="uk-margin-small-bottom kp-view-title">Two-Factor Authentication</h4>
                    <div class="uk-flex uk-flex-middle" style="gap:12px">
                        <span class="kp-badge kp-badge-manager" style="font-size:0.75rem">Disabled</span>
                        <button id="cu-totp-setup-btn" class="uk-button kp-btn-primary kp-btn-sm">Enable TOTP</button>
                    </div>
                    <div id="totp-setup-area" style="display:none" class="uk-margin-top">
                        <p class="kp-muted uk-text-small">Scan the QR code with your authenticator app, then enter the 6-digit code to activate.</p>
                        <div class="uk-text-center uk-margin-small" id="totp-qr-wrap">
                            <img id="totp-qr-img" style="display:none;width:220px;height:220px;border-radius:6px" alt="TOTP QR Code">
                        </div>
                        <p class="kp-muted uk-text-small uk-text-center uk-margin-remove-top">
                            Manual key: <code id="totp-secret-text" style="word-break:break-all"></code>
                        </p>
                        <div class="uk-flex" style="gap:8px;margin-top:8px">
                            <input class="uk-input kp-input" id="totp-confirm-code" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="letter-spacing:0.2em">
                            <button id="cu-totp-confirm-btn" class="uk-button kp-btn-primary" style="white-space:nowrap">Confirm &amp; Enable</button>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button id="cu-totp-skip-btn" class="uk-button kp-btn-ghost">Skip for now</button>
                    </div>
                </div>
            </div>
        </div>`);let s=UIkit.modal("#kp-create-user-modal");s.show(),document.getElementById("create-user-form").addEventListener("submit",async a=>{a.preventDefault();let n=a.target.querySelector('[type="submit"]'),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let r=new FormData(a.target),p={fname:r.get("fname").trim(),lname:r.get("lname").trim(),uname:r.get("uname").trim(),email:r.get("email").trim(),phone:r.get("phone").trim(),password:r.get("password"),role:parseInt(r.get("role"))};try{let d=T(await l.post("/users",p));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",V(d)),o.success(`User '${d.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",ge(d.id,s)}catch(d){o.error(d.message),n.disabled=!1,n.innerHTML=i}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function ge(e,t){let s=()=>{t.hide(),document.getElementById("kp-create-user-modal")?.remove(),u.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",s),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let a=document.getElementById("cu-totp-setup-btn");a.disabled=!0,a.textContent="Setting up\u2026";try{let n=await l.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=n.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await N(n.uri)}catch(n){o.error(n.message),a.disabled=!1,a.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let a=document.getElementById("totp-confirm-code").value.trim();if(a.length!==6){o.error("Enter a 6-digit code");return}let n=document.getElementById("cu-totp-confirm-btn");n.disabled=!0;try{let i=await l.post(`/users/${e}/totp/confirm`,{code:a});t.hide(),document.getElementById("kp-create-user-modal")?.remove(),o.success("TOTP enabled"),i.backup_codes?.length?U(i.backup_codes):u.go("users")}catch(i){o.error(i.message),n.disabled=!1}})}async function ce(e,t){document.getElementById("kp-edit-user-modal")?.remove();let s;try{s=T(await l.get(`/users/${t}`))}catch(c){o.error(c.message);return}let a=window.KP?.user?.role===99,n=`
        <div id="kp-edit-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit User \u2014 ${s.uname}</h3>
                <form id="edit-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        ${a?`
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" value="${s.uname}" autocomplete="off">
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" value="${s.fname}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" value="${s.lname}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" value="${s.email}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel" value="${s.phone||""}">
                        </div>
                        ${a?`
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50" ${s.role===50?"selected":""}>Manager</option>
                                <option value="99" ${s.role===99?"selected":""}>Admin</option>
                            </select>
                        </div>`:""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">New Password</label>
                            <input class="uk-input kp-input" name="password" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" uk-tooltip="leave blank to keep">
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Save Changes</button>
                    </div>
                </form>

                <hr class="uk-divider-muted uk-margin-top">

                <div id="totp-section">
                    <h4 class="uk-margin-small-bottom kp-view-title">Two-Factor Authentication</h4>
                    ${s.totp_enabled?`<div class="uk-flex uk-flex-middle" style="gap:12px">
                            <span class="kp-badge kp-badge-admin" style="font-size:0.75rem">Enabled</span>
                            <button id="totp-disable-btn" class="uk-button kp-btn-secondary kp-btn-sm">Disable TOTP</button>
                           </div>`:`<div class="uk-flex uk-flex-middle" style="gap:12px">
                            <span class="kp-badge kp-badge-manager" style="font-size:0.75rem">Disabled</span>
                            <button id="totp-setup-btn" class="uk-button kp-btn-primary kp-btn-sm">Enable TOTP</button>
                           </div>`}
                    <div id="totp-setup-area" style="display:none" class="uk-margin-top">
                        <p class="kp-muted uk-text-small">Scan the QR code with your authenticator app, then enter the 6-digit code to activate.</p>
                        <div class="uk-text-center uk-margin-small" id="totp-qr-wrap">
                            <img id="totp-qr-img" style="display:none;width:220px;height:220px;border-radius:6px" alt="TOTP QR Code">
                        </div>
                        <p class="kp-muted uk-text-small uk-text-center uk-margin-remove-top">
                            Manual key: <code id="totp-secret-text" style="word-break:break-all"></code>
                        </p>
                        <div class="uk-flex" style="gap:8px;margin-top:8px">
                            <input class="uk-input kp-input" id="totp-confirm-code" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="letter-spacing:0.2em">
                            <button id="totp-confirm-btn" class="uk-button kp-btn-primary" style="white-space:nowrap">Confirm &amp; Enable</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",n);let i=UIkit.modal("#kp-edit-user-modal");i.show(),document.getElementById("edit-user-form").addEventListener("submit",async c=>{c.preventDefault();let v=c.target.querySelector('[type="submit"]'),h=v.innerHTML;v.disabled=!0,v.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k=new FormData(c.target),b={fname:k.get("fname").trim(),lname:k.get("lname").trim(),email:k.get("email").trim(),phone:k.get("phone").trim()};if(a){b.role=parseInt(k.get("role"));let g=k.get("uname");g&&(b.uname=g.trim())}let m=k.get("password");m&&(b.password=m);try{await l.put(`/users/${t}`,b),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),o.success("User updated"),u.go("users")}catch(g){o.error(g.message),v.disabled=!1,v.innerHTML=h}});let r=document.getElementById("totp-setup-btn");r&&r.addEventListener("click",async()=>{r.disabled=!0,r.textContent="Setting up\u2026";try{let c=await l.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=c.secret,document.getElementById("totp-setup-area").style.display="",await N(c.uri)}catch(c){o.error(c.message),r.disabled=!1,r.textContent="Enable TOTP"}});let p=document.getElementById("totp-confirm-btn");p&&p.addEventListener("click",async()=>{let c=document.getElementById("totp-confirm-code").value.trim();if(c.length!==6){o.error("Enter a 6-digit code");return}p.disabled=!0;try{let v=await l.post(`/users/${t}/totp/confirm`,{code:c});i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),o.success("TOTP enabled"),v.backup_codes?.length?U(v.backup_codes):u.go("users")}catch(v){o.error(v.message),p.disabled=!1}});let d=document.getElementById("totp-disable-btn");d&&d.addEventListener("click",async()=>{d.disabled=!0;try{await l.delete(`/users/${t}/totp`),o.success("TOTP disabled"),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),u.go("users")}catch(c){o.error(c.message),d.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function pe(e){if(!$()){e.innerHTML=x("Access denied");return}let t=await l.get("/users");e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Users</h1>
            <button class="uk-button kp-btn-primary" id="users-new-btn">
                <span uk-icon="plus"></span> New User
            </button>
        </div>
        <div class="kp-table-wrap">
            <table class="uk-table uk-table-divider uk-table-middle uk-table-responsive uk-margin-remove">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th class="uk-text-center">2FA</th>
                        <th>Created</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="users-table-body">
                    ${t.map(s=>V(T(s))).join("")}
                </tbody>
            </table>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>de(e)),he(e)}function V(e){let t=e.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>';return`<tr data-user-id="${e.id}">
        <td><strong>${e.fname} ${e.lname}</strong></td>
        <td><span style="font-family:monospace">${e.uname}</span></td>
        <td>${e.email}</td>
        <td>${t}</td>
        <td class="uk-text-center">${e.totp_enabled?'<span uk-icon="icon: check; ratio: 0.9" style="color:var(--kp-success)"></span>':'<span uk-icon="icon: close; ratio: 0.9" style="color:var(--kp-text-dim)"></span>'}</td>
        <td><span class="kp-muted">${e.created}</span></td>
        <td>
            <div class="uk-flex" style="gap:6px;justify-content:flex-end">
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit-user" data-uid="${e.id}" title="Edit" uk-tooltip="Edit the User">
                    <span uk-icon="icon: pencil;"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="delete-user" data-uid="${e.id}" title="Delete" uk-tooltip="Delete the User">
                    <span uk-icon="icon: trash;"></span>
                </button>
            </div>
        </td>
    </tr>`}function he(e){e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="delete-user"]');if(!(!s||!await S("Delete User","Delete this user? This cannot be undone.")))try{await l.delete(`/users/${s.dataset.uid}`),s.closest("tr").remove(),o.success("User deleted")}catch(n){o.error(n.message)}}),e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="edit-user"]');s&&ce(e,s.dataset.uid)})}u.register("dashboard",e=>Q(e));u.register("sites",e=>z(e));u.register("site-detail",(e,t)=>re(e,t));u.register("users",e=>pe(e));u.register("settings",e=>J(e));u.register("security",e=>G(e));document.addEventListener("click",e=>{let t=e.target.closest("[data-view]");if(!t)return;e.preventDefault(),u.go(t.dataset.view);let s=document.getElementById("kp-offcanvas");s&&UIkit.offcanvas(s).hide()});document.addEventListener("click",async e=>{let t=e.target.closest("[data-action]");if(!t)return;e.stopPropagation();let{action:s,id:a}=t.dataset;switch(s){case"manage":u.go("site-detail",{id:a});break;case"start":await P(a,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await P(a,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await P(a,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await P(a,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"edit":{let n=await l.get(`/sites/${a}`);M(n.site);break}case"delete":await fe(a);break;case"update":await P(a,"update","Updating Images","Pulling latest container images - this may take a few minutes...");break;case"recreate":w("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await l.post(`/sites/${a}/recreate`),f(),o.success("Pod recreated"),u.go("site-detail",{id:a})}catch(n){f(),o.error(n.message)}break}});async function P(e,t,s,a){w(s,a);try{await l.post(`/sites/${e}/${t}`),f(),o.success(s+" complete"),["start","stop","restart"].includes(t)&&u.go("sites")}catch(n){f(),o.error(n.message)}}async function fe(e){if(!await S("Delete Site","This will stop and permanently remove the pod and all its data. Are you sure?"))return;w("Deleting Site","Stopping containers and removing the pod - please wait...");try{await l.delete(`/sites/${e}`)}catch{}let s=!1,a=0;for(;!s&&a<10;){try{await new Promise(i=>setTimeout(i,2e3)),s=!(await l.get("/sites")).find(i=>i.ID===parseInt(e))}catch{}a++}f(),s?(o.success("Site deleted"),u.go("sites")):o.error("Delete failed - site still exists after 20s")}window.addEventListener("hashchange",()=>{let{view:e,params:t}=A();u.go(e,t)});var{view:ye,params:we}=A();u.go(ye,we);})();
