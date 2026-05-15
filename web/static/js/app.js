"use strict";(()=>{var d={async _req(e,t,s,a=6e4){let n=new AbortController,i=setTimeout(()=>n.abort(),a),c={method:e,headers:{"Content-Type":"application/json"},signal:n.signal};s!==void 0&&(c.body=JSON.stringify(s));try{let r=await fetch("/api"+t,c);clearTimeout(i);let o=r.status===204?null:await r.json().catch(()=>null);if(r.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!r.ok)throw new Error(o?.error||`HTTP ${r.status}`);return o}catch(r){throw clearTimeout(i),r}},get:e=>d._req("GET",e),post:(e,t)=>d._req("POST",e,t),put:(e,t)=>d._req("PUT",e,t),delete:e=>d._req("DELETE",e)};var K=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',S=e=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,q=(e,t)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${e}; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,$=e=>{let t={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[s,a]=t[e]||["stopped","Unknown"];return`<span class="kp-status kp-status-${s}">${a}</span>`},ve=e=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[e]||"?",M=e=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET"})[e]||"?",E=()=>window.KP.user.role===window.KP.roles.admin,P=e=>{switch(e.SiteType){case 1:case 2:return`PHP ${ve(e.PHPVersion)}`;case 4:return`Node ${{1:"20",2:"22",3:"23"}[e.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[e.RuntimeVersion]||"?"}`;default:return""}},L=e=>({id:e.id??e.ID,uname:e.uname??e.UName,uhash:e.uhash??e.UHash,fname:e.fname??e.FName,lname:e.lname??e.LName,email:e.email??e.Email,phone:e.phone??e.Phone,role:e.role??e.Role,totp_enabled:e.totp_enabled??!1,created:e.created??e.Created});function w(e,t){return new Promise(s=>{document.getElementById("kp-confirm-title").textContent=e,document.getElementById("kp-confirm-message").textContent=t;let a=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{a.hide(),s(!0)},{once:!0}),a.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>s(!1),{once:!0})})}function y(e,t){let s=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${e}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${t}</p>
                <p class="kp-muted">
                    This may take several minutes while images are pulled and containers are initialized.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s),UIkit.modal("#kp-progress-modal").show()}function h(){let e=document.getElementById("kp-progress-modal");e&&(UIkit.modal(e).hide(),setTimeout(()=>e.remove(),300))}var m={routes:{},register(e,t){this.routes[e]=t},async go(e,t={}){let s=Object.keys(t).length?e+"/"+Object.values(t).join("/"):e;window.location.hash=s,document.querySelectorAll(".kp-nav-link").forEach(i=>{i.classList.toggle("kp-active",i.dataset.view===e)});let a=this.routes[e];if(!a)return;let n=document.getElementById("kp-view");n.innerHTML=K();try{await a(n,t)}catch(i){n.innerHTML=S(i.message)}}};function j(){let t=(window.location.hash.replace("#","")||"dashboard").split("/"),s=t[0],a={};return s==="site-detail"&&t[1]&&(a.id=t[1]),{view:s,params:a}}var l={show(e,t="info",s=7e3){let a={success:"check",error:"warning",info:"info"},n=document.createElement("div");n.className=`kp-toast kp-toast-${t}`,n.innerHTML=`<span uk-icon="${a[t]||"info"}"></span><span>${e}</span>`,document.getElementById("kp-toasts").appendChild(n),UIkit.icon(n.querySelector("[uk-icon]")),setTimeout(()=>n.remove(),s)},success:e=>l.show(e,"success"),error:e=>l.show(e,"error"),info:e=>l.show(e,"info")};async function _(e){let t=`
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
                                <option value="2" ${e.RuntimeVersion===2?"selected":""}>Node 22 (LTS)</option>
                                <option value="4" ${e.RuntimeVersion===4?"selected":""}>Node 24</option>
                                <option value="5" ${e.RuntimeVersion===5?"selected":""}>Node 25</option>
                                <option value="6" ${e.RuntimeVersion===6?"selected":""}>Node 26</option>                                
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
        </div>`;document.body.insertAdjacentHTML("beforeend",t);let s=UIkit.modal("#kp-edit-site-modal"),a=document.getElementById("es-site-type"),n=document.getElementById("es-php-version-wrap"),i=document.getElementById("es-node-version-wrap"),c=document.getElementById("es-dotnet-version-wrap"),r=document.getElementById("es-start-command-wrap"),o=document.getElementById("es-wordpress-wrap");s.show();let p=u=>{n.classList.toggle("uk-hidden",u!==1&&u!==2),i.classList.toggle("uk-hidden",u!==4),c.classList.toggle("uk-hidden",u!==5),r.classList.toggle("uk-hidden",u!==4&&u!==5),o.classList.toggle("uk-hidden",u!==1)};p(e.SiteType),a.addEventListener("change",()=>p(parseInt(a.value))),document.getElementById("edit-site-form").addEventListener("submit",async u=>{u.preventDefault();let g=u.target.querySelector('[type="submit"]'),k=g.innerHTML;g.disabled=!0,g.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let v=new FormData(u.target),b=parseInt(v.get("site_type")),f=null;b===4&&(f=parseInt(v.get("node_version"))),b===5&&(f=parseInt(v.get("dotnet_version")));let x={name:v.get("name").trim(),php_version:parseInt(v.get("php_version"))||3,site_type:b,runtime_version:f,start_command:v.get("start_command")?.trim()||""},W=b===1?v.get("install_wordpress")==="on":!1;try{await d.put(`/sites/${e.ID}`,x),s.hide(),document.getElementById("kp-edit-site-modal")?.remove(),y("Applying Changes","Saving changes and recreating pod...");try{await d.post(`/sites/${e.ID}/recreate`,{install_wordpress:W}),h(),l.success("Site updated and pod recreated")}catch(O){h(),l.error("Site saved but pod recreate failed: "+O.message)}m.go("site-detail",{id:String(e.ID)})}catch(O){l.error(O.message),g.disabled=!1,g.innerHTML=k}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function H(){document.body.insertAdjacentHTML("beforeend",`
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
                                <option value="2" selected>Node 22 (LTS)</option>
                                <option value="4">Node 24</option>
                                <option value="5">Node 25</option>
                                <option value="6">Node 26</option>
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
        </div>`);let t=UIkit.modal("#kp-create-site-modal"),s=document.getElementById("cs-site-type"),a=document.getElementById("cs-php-version-wrap"),n=document.getElementById("cs-node-version-wrap"),i=document.getElementById("cs-dotnet-version-wrap"),c=document.getElementById("cs-start-command-wrap"),r=document.getElementById("cs-wordpress-wrap");t.show(),s.addEventListener("change",()=>{let o=parseInt(s.value);a.classList.toggle("uk-hidden",o!==1&&o!==2),n.classList.toggle("uk-hidden",o!==4),i.classList.toggle("uk-hidden",o!==5),c.classList.toggle("uk-hidden",o!==4&&o!==5),r.classList.toggle("uk-hidden",o!==1)}),document.getElementById("create-site-form").addEventListener("submit",async o=>{o.preventDefault();let p=o.target.querySelector('[type="submit"]'),u=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let g=new FormData(o.target),k=parseInt(g.get("site_type")),v=null;k===4&&(v=parseInt(g.get("node_version"))),k===5&&(v=parseInt(g.get("dotnet_version")));let b={name:g.get("name").trim(),php_version:parseInt(g.get("php_version"))||3,site_type:k,runtime_version:v,start_command:g.get("start_command")?.trim()||"",domains:g.get("domains").split(`
`).map(f=>f.trim()).filter(Boolean),install_wordpress:k===1?g.get("install_wordpress")==="on":!1};t.hide(),document.getElementById("kp-create-site-modal")?.remove(),y("Creating Site",`Setting up '${b.name}' \u2014 pulling images and provisioning containers...`);try{await d.post("/sites",b),h(),l.success(`Site '${b.name}' created`),m.go("sites")}catch(f){h(),l.error(f.message),p.disabled=!1,p.innerHTML=u}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}async function Q(e){let t=await d.get("/sites")??[];e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn">
                <span uk-icon="plus"></span> New Site
            </button>
        </div>
        <div class="kp-site-grid">
            ${t.length===0?q("world","No sites yet \u2014 create one to get started"):t.map(V).join("")}
        </div>`,document.getElementById("sites-new-btn").addEventListener("click",()=>H())}function V(e){let t=e.Domains?.[0]??null;return`
        <div class="kp-site-card" data-site-id="${e.ID}" data-status="${e.SiteStatus}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${e.ID}">${e.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${e.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${M(e.SiteType)}${P(e)?" / "+P(e):""}</span>
                        ${t?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${t}" target="_blank" style="color:var(--kp-cyan)">${t}</a></span>`:""}
                    </div>
                </div>
                ${$(e.SiteStatus)}
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
        </div>`}async function G(e){let t=await d.get("/sites")??[],s=t.filter(i=>i.SiteStatus===1).length,a=t.filter(i=>i.SiteStatus===2).length,n=t.filter(i=>i.SiteStatus===4).length;e.innerHTML=`
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
            ${t.length===0?q("world","No sites yet"):t.slice(0,6).map(V).join("")}
        </div>`,document.getElementById("dash-new-site")?.addEventListener("click",()=>H())}function R(e=null){let t=e?`/sites/${e}/security/ip`:"/security/ip",s=e?`/sites/${e}/security/ua`:"/security/ua",a=e?`/sites/${e}/waf`:"/settings/waf";return`
        <div id="security-panel" data-ip-base="${t}" data-ua-base="${s}" data-waf-base="${a}">

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">IP Rules</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${t}/export" download="${e?`site-${e}-ip-rules.csv`:"podnest-global-ip-rules.csv"}" uk-tooltip="Export IP rules as CSV">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import IP rules from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-ip-import" accept=".csv" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ip-save" uk-tooltip="Save the IP Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
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

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">User-Agent Rules</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${s}/export" download="${e?`site-${e}-ua-rules.csv`:"podnest-global-ua-rules.csv"}" uk-tooltip="Export UA rules as CSV">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import UA rules from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-ua-import" accept=".csv" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ua-save" uk-tooltip="Save the User-Agent Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
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

            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Web Application Firewall</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-waf-save" uk-tooltip="Save WAF Settings">
                        <span uk-icon="check"></span>
                    </button>
                </div>

                ${e?`
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Override the global WAF setting for this site and add site-specific rule exclusions
                    on top of any global exclusions.
                </p>
                <div class="uk-margin-small-bottom">
                    <label class="kp-label" for="sec-waf-override">Site Behaviour</label>
                    <select class="uk-select kp-select" id="sec-waf-override">
                        <option value="0">Inherit global setting</option>
                        <option value="1">Force ON for this site</option>
                        <option value="2">Force OFF for this site</option>
                    </select>
                </div>
                <div class="uk-margin-small-bottom">
                    <label class="kp-label" for="sec-waf-exclusions">Additional Rule Exclusions</label>
                    <textarea class="uk-textarea kp-textarea kp-mono" id="sec-waf-exclusions" rows="6"
                        placeholder="# Numeric = rule ID, text = tag name, one per line&#10;942100&#10;attack-xss"></textarea>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Merged on top of global exclusions. Useful for WooCommerce, contact forms, or file uploads that trigger false positives.
                    </p>
                </div>
                `:`
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Inspects all proxied requests using the OWASP Core Rule Set.
                    Start in Detection mode to review false positives before enabling Prevention.
                    The engine recompiles in the background after saving.
                </p>
                <div class="uk-grid-small uk-margin-small-bottom" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label" for="sec-waf-mode">Mode</label>
                        <select class="uk-select kp-select" id="sec-waf-mode">
                            <option value="0">Detection \u2014 log matches only</option>
                            <option value="1">Prevention \u2014 block matching requests</option>
                        </select>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label" for="sec-waf-paranoia">Paranoia Level</label>
                        <select class="uk-select kp-select" id="sec-waf-paranoia">
                            <option value="1">1 \u2014 Baseline (recommended)</option>
                            <option value="2">2 \u2014 Moderate</option>
                            <option value="3">3 \u2014 Strict</option>
                            <option value="4">4 \u2014 Paranoid</option>
                        </select>
                    </div>
                </div>
                <div class="uk-margin-small-bottom">
                    <label class="kp-label">
                        <input class="uk-checkbox" type="checkbox" id="sec-waf-enabled">
                        &nbsp;Enable WAF (OWASP Core Rule Set)
                    </label>
                    &nbsp;&nbsp;
                    <label class="kp-label">
                        <input class="uk-checkbox" type="checkbox" id="sec-waf-audit">
                        &nbsp;Enable Audit Log
                    </label>
                </div>
                <div class="uk-margin-small-bottom">
                    <label class="kp-label" for="sec-waf-exclusions">Global Rule Exclusions</label>
                    <textarea class="uk-textarea kp-textarea kp-mono kp-waf-exclusions" id="sec-waf-exclusions" rows="15"
                        placeholder="# Numeric = rule ID, text = tag name, one per line&#10;920350&#10;attack-sqli"></textarea>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Numeric entries map to <span class="kp-mono">SecRuleRemoveById</span>;
                        text entries to <span class="kp-mono">SecRuleRemoveByTag</span>.
                    </p>
                </div>
                `}

            </div>

        </div>`}async function T(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,a=t.dataset.uaBase,n=t.dataset.wafBase;try{let[i,c,r]=await Promise.all([d.get(s),d.get(a),d.get(n)]);e.querySelector("#sec-ip-whitelist").value=i.whitelist??"",e.querySelector("#sec-ip-blacklist").value=i.blacklist??"",e.querySelector("#sec-ua-whitelist").value=c.whitelist??"",e.querySelector("#sec-ua-blacklist").value=c.blacklist??"",e.querySelector("#sec-waf-exclusions").value=r.Exclusions??r.exclusions??"";let o=e.querySelector("#sec-waf-enabled"),p=e.querySelector("#sec-waf-audit"),u=e.querySelector("#sec-waf-mode"),g=e.querySelector("#sec-waf-paranoia");o&&(o.checked=!!r.Enabled),p&&(p.checked=!!r.AuditLog),u&&(u.value=String(r.Mode??0)),g&&(g.value=String(r.ParanoiaLevel??1));let k=e.querySelector("#sec-waf-override");k&&(k.value=String(r.Override??0))}catch(i){l.error("Failed to load security rules: "+i.message)}}function A(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,a=t.dataset.uaBase,n=t.dataset.wafBase;e.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-ip-save"),c=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(s,{whitelist:e.querySelector("#sec-ip-whitelist").value,blacklist:e.querySelector("#sec-ip-blacklist").value}),l.success("IP rules saved")}catch(r){l.error(r.message)}finally{i.disabled=!1,i.innerHTML=c}}),e.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-ua-save"),c=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(a,{whitelist:e.querySelector("#sec-ua-whitelist").value,blacklist:e.querySelector("#sec-ua-blacklist").value}),l.success("UA rules saved")}catch(r){l.error(r.message)}finally{i.disabled=!1,i.innerHTML=c}}),e.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let i=e.querySelector("#sec-waf-save"),c=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{let r=e.querySelector("#sec-waf-override");r?await d.put(n,{override:parseInt(r.value,10),exclusions:e.querySelector("#sec-waf-exclusions").value.trim()}):await d.put(n,{enabled:e.querySelector("#sec-waf-enabled").checked,mode:parseInt(e.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(e.querySelector("#sec-waf-paranoia").value,10),audit_log:e.querySelector("#sec-waf-audit").checked,exclusions:e.querySelector("#sec-waf-exclusions").value.trim()}),l.success("WAF settings saved \u2014 engine recompiling in background")}catch(r){l.error(r.message)}finally{i.disabled=!1,i.innerHTML=c}}),e.querySelector("#sec-ip-import")?.addEventListener("change",async i=>{let c=i.target.files[0];if(!c)return;let r=new FormData;r.append("file",c);try{let o=await fetch("/api"+s+"/import",{method:"POST",body:r}),p=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(p?.error||`HTTP ${o.status}`);await T(e),l.success("IP rules imported")}catch(o){l.error(o.message)}finally{i.target.value=""}}),e.querySelector("#sec-ua-import")?.addEventListener("change",async i=>{let c=i.target.files[0];if(!c)return;let r=new FormData;r.append("file",c);try{let o=await fetch("/api"+a+"/import",{method:"POST",body:r}),p=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(p?.error||`HTTP ${o.status}`);await T(e),l.success("UA rules imported")}catch(o){l.error(o.message)}finally{i.target.value=""}})}async function Y(e){if(!E()){e.innerHTML=S("Access denied");return}e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 a blacklisted entry cannot be overridden by any whitelist.
        </p>
        ${R(null)}`,A(e),T(e)}function fe(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function J(e){let t=document.getElementById("admin-domain-ssl");if(!(!t||!e))try{let s=await d.get(`/ssl-status?domain=${encodeURIComponent(e)}`);t.outerHTML=fe(s.status)}catch{}}async function X(e){if(!E()){e.innerHTML=S("Access denied");return}let[t,s,a]=await Promise.all([d.get("/settings"),d.get("/settings/backup"),d.get("/settings/waf")]);e.innerHTML=`
    <div class="kp-view-header">
        <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Settings</h1>
    </div>
    <div class="uk-grid uk-grid-medium uk-margin-large-bottom" uk-grid>
        <div class="uk-width-1-1">
            <!-- panel configuration -->
            <div class="kp-card uk-padding">
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
        </div>
        <div class="uk-width-1-2@m">
            <!-- backup schedule / retention -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">Backup Schedule</h3>
                <form id="backup-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="backup-schedule">Cron Schedule</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="backup-schedule"
                            name="backup_schedule"
                            type="text"
                            placeholder="0 2 * * *"
                            value="${s.backup_schedule??""}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Standard 5-field cron expression. Leave blank to disable automatic backups.<br>
                            Examples: <span class="kp-mono">0 2 * * *</span> (daily at 2am) &nbsp;
                            <span class="kp-mono">0 */6 * * *</span> (every 6 hours)
                        </p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="backup-retain-days">Retain Backups (days)</label>
                        <input
                            class="uk-input kp-input"
                            id="backup-retain-days"
                            name="backup_retain_days"
                            type="number"
                            min="1"
                            max="365"
                            placeholder="30"
                            value="${s.backup_retain_days??"30"}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Snapshots older than this many days will be pruned automatically after each backup run.
                        </p>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
        <div class="uk-width-1-2@m">
            <!-- S3 backup storage -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">S3 Backup Storage</h3>
                <form id="s3-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-endpoint">Endpoint URL</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-endpoint"
                            name="s3_endpoint"
                            type="url"
                            placeholder="https://s3.amazonaws.com"
                            value="${s.s3_endpoint??""}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            AWS S3 or any S3-compatible endpoint (Backblaze B2, MinIO, Wasabi, etc.)
                        </p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-bucket">Bucket</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-bucket"
                            name="s3_bucket"
                            type="text"
                            placeholder="my-podnest-backups"
                            value="${s.s3_bucket??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-region">Region</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-region"
                            name="s3_region"
                            type="text"
                            placeholder="us-east-1"
                            value="${s.s3_region??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-access-key">Access Key ID</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-access-key"
                            name="s3_access_key"
                            type="text"
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                            value="${s.s3_access_key??""}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-secret-key">Secret Access Key</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-secret-key"
                            name="s3_secret_key"
                            type="password"
                            placeholder="${s.s3_secret_key?"saved \u2014 enter new value to change":"enter secret key"}"
                            value="">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Leave blank to keep the existing key.
                        </p>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `,t.admin_domain&&J(t.admin_domain),document.getElementById("settings-form").addEventListener("submit",async n=>{n.preventDefault();let i=n.target.querySelector('[type="submit"]'),c=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let o={admin_domain:new FormData(n.target).get("admin_domain").trim()};try{await d.put("/settings",o),l.success("Settings saved"),J(o.admin_domain)}catch(p){l.error(p.message)}finally{i.disabled=!1,i.innerHTML=c}}),document.getElementById("backup-form").addEventListener("submit",async n=>{n.preventDefault();let i=n.target.querySelector('[type="submit"]'),c=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let r=new FormData(n.target),o={backup_schedule:r.get("backup_schedule").trim(),backup_retain_days:r.get("backup_retain_days").trim()};try{await d.put("/settings/backup",o),l.success("Backup settings saved")}catch(p){l.error(p.message)}finally{i.disabled=!1,i.innerHTML=c}}),document.getElementById("s3-form").addEventListener("submit",async n=>{n.preventDefault();let i=n.target.querySelector('[type="submit"]'),c=i.innerHTML;i.disabled=!0,i.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let r=new FormData(n.target),o={s3_endpoint:r.get("s3_endpoint").trim(),s3_bucket:r.get("s3_bucket").trim(),s3_region:r.get("s3_region").trim(),s3_access_key:r.get("s3_access_key").trim()},p=r.get("s3_secret_key").trim();p&&(o.s3_secret_key=p);try{await d.put("/settings/backup",o),l.success("S3 settings saved")}catch(u){l.error(u.message)}finally{i.disabled=!1,i.innerHTML=c}})}function Z(e){return`
        <div id="backups-panel" data-site-id="${e}">

            <!-- repo config card -->
            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Backup Destinations</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-repo-save" uk-tooltip="Save Your Backup Configuration">
                        <span uk-icon="check"></span>
                    </button>
                </div>
                <div class="uk-flex" style="gap:24px;flex-wrap:wrap" id="backup-repo-toggles">
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="backup-local-enabled">
                        <span class="kp-text">Local</span>
                    </label>
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="backup-s3-enabled">
                        <span class="kp-text">S3</span>
                    </label>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    Local backups are stored under the site's SFTP home directory and are accessible
                    over SFTP as <span class="kp-mono">backups/local/</span>. S3 requires global S3
                    credentials to be configured under Settings.
                </p>
            </div>

            <!-- backup list card -->
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Snapshots</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-run-btn" uk-tooltip="Run a Manual Backup">
                        <span uk-icon="cloud-upload"></span>
                    </button>
                </div>
                <div id="backup-error-banner"></div>
                <div id="backup-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>

        </div>`}function he(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let t=n=>n===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>',s=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:n<1073741824?`${(n/1048576).toFixed(1)} MB`:`${(n/1073741824).toFixed(2)} GB`;return`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead>
                <tr>
                    <th>Snapshot ID</th>
                    <th>Label</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Created</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${e.map(n=>`
        <tr>
            <td class="kp-mono" style="font-size:0.8rem">${n.SnapshotID}</td>
            <td>${n.Label||"\u2014"}</td>
            <td>${t(n.BackupType)}</td>
            <td>${s(n.SizeBytes)}</td>
            <td>${new Date(n.Created).toLocaleString()}</td>
            <td>
                <div class="uk-flex" style="gap:6px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm backup-download-btn"
                        data-id="${n.ID}" uk-tooltip="Download backup archive">
                        <span uk-icon="download"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm backup-restore-btn"
                        data-id="${n.ID}" uk-tooltip="Restore from this snapshot">
                        <span uk-icon="history"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm backup-delete-btn"
                        data-id="${n.ID}" uk-tooltip="Delete this snapshot">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>`}async function B(e,t){try{let[s,a]=await Promise.all([d.get(`/sites/${t}/backup-repo`),d.get(`/sites/${t}/backups`)]),n=e.querySelector("#backup-local-enabled"),i=e.querySelector("#backup-s3-enabled");n&&(n.checked=!!s.LocalEnabled),i&&(i.checked=!!s.S3Enabled);let c=e.querySelector("#backup-error-banner");if(c)if(s.last_error){let o=s.last_error_at?` (${new Date(s.last_error_at).toLocaleString()})`:"";c.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${o}:</strong> ${s.last_error}</p>
                    </div>`}else c.innerHTML="";let r=e.querySelector("#backup-list-wrap");r&&(r.innerHTML=he(a))}catch(s){let a=e.querySelector("#backup-list-wrap");a&&(a.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${s.message}</p>`)}}function ee(e,t){e.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let s={local_enabled:e.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:e.querySelector("#backup-s3-enabled")?.checked??!1};try{await d.put(`/sites/${t}/backup-repo`,s),l.success("Backup destinations saved")}catch(a){l.error(a.message)}}),e.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{let s=0;try{s=(await d.get(`/sites/${t}/backups`))?.length??0}catch{}try{await d.post(`/sites/${t}/backups`,{label:"manual"})}catch(i){l.error(i.message);return}y("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let a=Date.now()+600*1e3,n=setInterval(async()=>{try{(((await d.get(`/sites/${t}/backups`))?.length??0)>s||Date.now()>a)&&(clearInterval(n),h(),await B(e,t),Date.now()<=a&&l.success("Backup complete"))}catch{}},4e3)}),e.querySelector("#backup-list-wrap")?.addEventListener("click",async s=>{let a=s.target.closest(".backup-restore-btn");if(a){let c=a.dataset.id;if(!await w("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await d.post(`/sites/${t}/backups/${c}/restore`)}catch(g){l.error(g.message);return}y("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let o=Date.now(),p=Date.now()+900*1e3,u=setInterval(async()=>{try{let g=await d.get(`/sites/${t}/backups/restore-status`);(!g?.active||Date.now()>p)&&(clearInterval(u),h(),g?.active?l.error("Restore timed out"):l.success("Restore complete"),await B(e,t))}catch{}},3e3);return}let n=s.target.closest(".backup-delete-btn");if(n){let c=n.dataset.id;if(!await w("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;y("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await d.delete(`/sites/${t}/backups/${c}`),h(),l.success("Snapshot deleted"),await B(e,t)}catch(o){h(),l.error(o.message)}}let i=s.target.closest(".backup-download-btn");if(i){let c=i.dataset.id;y("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let r=document.createElement("a");r.href=`/api/sites/${t}/backups/${c}/download`,r.style.display="none",document.body.appendChild(r),r.click(),document.body.removeChild(r),setTimeout(()=>{h()},5e3)},300);return}})}var N={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish"};function C(e,t,s){let a=s?Object.entries(s):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <span class="kp-muted uk-text-small">${a.length} configuration keys</span>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="${t}" uk-tooltip="Add a Key">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="${t}" data-site="${e}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="${t}" data-site="${e}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${e}/configs/${t}/export" download="${e}-config-${t}.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="${t}" data-site="${e}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="${t}" data-site="${e}">
                    </label>
                </div>
            </div>
            <div class="kp-config-grid cfg-rows" data-type="${t}">
                ${a.map(([n,i])=>I(n,i)).join("")}
            </div>
        </div>`}function te(e,t){let s=t?.enabled==="true",a=t?Object.entries(t).filter(([n])=>n!=="enabled"):[];return`
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom" uk-tooltip="Add a Key">
                <span class="kp-muted uk-text-small">${a.length} configuration keys</span>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="5">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="5" data-site="${e}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="5" data-site="${e}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${e}/configs/5/export" download="${e}-config-5.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="5" data-site="${e}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="5" data-site="${e}">
                    </label>
                </div>
            </div>

            <!-- enable/disable toggle \u2014 requires pod recreate to take effect -->
            <div class="uk-margin-small-bottom" style="background:var(--kp-surface-2);padding:10px 12px;border-radius:6px">
                <label class="uk-flex uk-flex-middle" style="gap:10px;cursor:pointer">
                    <input type="checkbox" class="uk-checkbox varnish-enabled-toggle" ${s?"checked":""}>
                    <span>Enable Varnish Cache</span>
                    <span class="kp-muted uk-text-small">\u2014 requires pod recreate to take effect</span>
                </label>
            </div>

            <div class="kp-config-grid cfg-rows" data-type="5">
                ${a.map(([n,i])=>I(n,i)).join("")}
            </div>
        </div>`}function I(e="",t=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${e}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${t}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function se(e,t){e.addEventListener("click",s=>{if(s.target.closest(".cfg-add-row")){let a=s.target.closest(".cfg-add-row");e.querySelector(`.cfg-rows[data-type="${a.dataset.type}"]`).insertAdjacentHTML("beforeend",I())}}),e.addEventListener("click",s=>{s.target.closest(".cfg-del-row")&&s.target.closest(".kp-config-row").remove()}),e.addEventListener("click",async s=>{let a=s.target.closest(".cfg-save");if(!a)return;let{type:n,site:i}=a.dataset,c=e.querySelectorAll(`.cfg-rows[data-type="${n}"] .kp-config-row`),r={};if(c.forEach(o=>{let p=o.querySelector(".cfg-key").value.trim(),u=o.querySelector(".cfg-val").value.trim();p&&(r[p]=u)}),n==="5"){let o=e.querySelector(".varnish-enabled-toggle");r.enabled=o?.checked?"true":"false"}try{await d.put(`/sites/${i}/configs/${n}`,r),l.success(`${N[n]} config saved`)}catch(o){l.error(o.message)}}),e.addEventListener("click",async s=>{let a=s.target.closest(".cfg-reset");if(!a)return;let{type:n,site:i}=a.dataset;if(await w("Reset Config",`Reset ${N[n]} config to defaults?`))try{let r=await d.post(`/sites/${i}/configs/${n}/reset`),o=e.querySelector(`.cfg-rows[data-type="${n}"]`);o.innerHTML=Object.entries(r).map(([p,u])=>I(p,u)).join(""),l.success(`${N[n]} reset to defaults`)}catch(r){l.error(r.message)}}),e.addEventListener("change",async s=>{let a=s.target.closest(".cfg-import-input");if(!a)return;let{type:n,site:i}=a.dataset,c=a.files[0];if(!c)return;let r=new FormData;r.append("file",c);try{let o=await fetch(`/api/sites/${i}/configs/${n}/import`,{method:"POST",body:r}),p=o.status===204?null:await o.json().catch(()=>null);if(!o.ok)throw new Error(p?.error||`HTTP ${o.status}`);let u=e.querySelector(`.cfg-rows[data-type="${n}"]`);u.innerHTML=Object.entries(p).map(([g,k])=>I(g,k)).join(""),l.success(`${N[n]} config imported`)}catch(o){l.error(o.message)}finally{a.value=""}})}function ae(e,t){return`
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    <option value="nginx">Nginx</option>
                    ${(()=>{switch(t){case 1:case 2:return'<option value="php">PHP-FPM</option>';case 4:return'<option value="app">Node.js</option>';case 5:return'<option value="app">.NET</option>';default:return""}})()}
                    <option value="db">MariaDB</option>
                    <option value="redis">Redis</option>
                    <option value="waf">WAF Log</option>
                </select>
                <select class="uk-select kp-select" id="log-tail" style="width:120px;height:38px">
                    <option value="100">100 lines</option>
                    <option value="250">250 lines</option>
                    <option value="500">500 lines</option>
                    <option value="1000">1000 lines</option>
                </select>
                <button class="uk-button kp-btn-secondary kp-btn-sm" id="log-connect" uk-tooltip="Start Tailing the Logs">
                    <span uk-icon="play"></span>
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="log-disconnect" disabled uk-tooltip="Stop Tailing the Logs">
                    <span uk-icon="ban"></span>
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="log-clear" uk-tooltip="Clear the Logs">
                    <span uk-icon="trash"></span>
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
        </div>`}function ne(e,t){let s=null,a=!1,n=e.querySelector("#log-output"),i=e.querySelector("#log-connect"),c=e.querySelector("#log-disconnect"),r=e.querySelector("#log-clear"),o=e.querySelector("#log-autoscroll"),p=e.querySelector("#log-status");function u(v){v.split(`
`).forEach(b=>{if(!b)return;let f=document.createElement("div");f.className=b.match(/WAF BLOCK/i)?"kp-log-line-err":b.match(/WAF DETECT/i)?"kp-log-line-warn":b.match(/error|crit|emerg/i)?"kp-log-line-err":b.match(/warn/i)?"kp-log-line-warn":b.match(/info|notice/i)?"kp-log-line-info":"",f.textContent=b,n.appendChild(f)}),o.checked&&(n.scrollTop=n.scrollHeight)}function g(){s&&(s.close(),s=null),a=!1,i.disabled=!1,c.disabled=!0,p&&(p.textContent="Disconnected")}i.addEventListener("click",()=>{g();let v=e.querySelector("#log-container").value,b=e.querySelector("#log-tail").value,f=location.protocol==="https:"?"wss":"ws",x=v==="waf"?`${f}://${location.host}/api/sites/${t}/logs/waf?tail=${b}`:`${f}://${location.host}/api/sites/${t}/logs?container=${v}&tail=${b}`;s=new WebSocket(x),s.onopen=()=>{a=!0,i.disabled=!0,c.disabled=!1,p&&(p.textContent=`Connected \u2014 ${v}`)},s.onmessage=W=>u(W.data),s.onerror=()=>{},s.onclose=()=>{a=!1,i.disabled=!1,c.disabled=!0,p&&(p.textContent="Disconnected")}}),c.addEventListener("click",g),r.addEventListener("click",()=>{n.innerHTML=""}),e.querySelector("#log-container").addEventListener("change",()=>{s&&s.readyState===WebSocket.OPEN&&(g(),i.click())});let k=m.go.bind(m);m.go=function(v,b={}){return s&&g(),k(v,b)}}function ye(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function ie(e,t){try{let s=await d.get(`/ssl-status?domain=${encodeURIComponent(e)}`),a=document.getElementById(`ssl-icon-${t}`);a&&(a.outerHTML=ye(s.status))}catch{}}function oe(e){e.forEach(t=>ie(t.Domain,t.ID))}function le(e,t,s){let a=e.SiteType!==3&&e.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${e.Name}</td></tr>
                            <tr><td class="kp-muted">Internal Port</td><td>:${e.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${M(e.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${P(e)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${$(e.SiteStatus)}</td></tr>
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
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="domain-add-btn" uk-tooltip="Add a New Domain">
                            <span uk-icon="plus"></span>
                        </button>
                    </div>
                    <div id="domain-list">
                        ${t.length?t.map(re).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
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
        </div>`}function re(e){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${e.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${e.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${e.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${e.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function ce(e,t){e.querySelector("#domain-add-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.remove("uk-hidden")}),e.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.add("uk-hidden")}),e.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#domain-add-input").value.trim();if(s)try{let a=await d.post(`/sites/${t}/domains`,{domain:s});e.querySelector("#domain-list").insertAdjacentHTML("beforeend",re(a)),ie(a.Domain,a.ID),e.querySelector("#domain-add-form").classList.add("uk-hidden"),e.querySelector("#domain-add-input").value="",l.success("Domain added")}catch(a){l.error(a.message)}}),e.querySelector("#domain-list")?.addEventListener("click",async s=>{let a=s.target.closest('[data-action="delete-domain"]');if(!(!a||!await w("Remove Domain","Remove this domain from the site?")))try{await d.delete(`/sites/${t}/domains/${a.dataset.did}`),a.closest("[data-domain-id]").remove(),l.success("Domain removed")}catch(i){l.error(i.message)}})}function de(e,t){e.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#sftp-regen-btn"),a=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.post(`/sites/${t}/sftp-regen`),l.success("SFTP password regenerated"),m.go("site-detail",{id:String(t)})}catch(n){l.error(n.message),s.disabled=!1,s.innerHTML=a}}),e.querySelector("#sftp-copy-btn")?.addEventListener("click",()=>{let s=e.querySelector("#sftp-pass-display")?.textContent;if(s)if(navigator.clipboard)navigator.clipboard.writeText(s).then(()=>l.success("Password copied to clipboard")).catch(()=>l.error("Failed to copy password"));else{let a=document.createElement("textarea");a.value=s,a.style.cssText="position:fixed;opacity:0",document.body.appendChild(a),a.select(),document.execCommand("copy"),document.body.removeChild(a),l.success("Password copied to clipboard")}}),e.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#pma-open-btn"),a=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let n=await d.post(`/sites/${t}/pma-token`);window.open(n.url,"_blank")}catch(n){l.error(n.message)}finally{s.disabled=!1,s.innerHTML=a}})}var we=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function pe(e){return`
        <div>
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${we.map(t=>`
                   <button class="uk-button kp-btn-ghost kp-btn-sm"
                        data-action="wpcli-quick"
                        data-cmd="${t.cmd}">
                        ${t.label}
                    </button>`).join("")}
            </div>
            
            <p class="kp-muted uk-text-small uk-margin-small-top">
                <span uk-icon="icon: info; ratio: 0.75"></span>
                WP-CLI <span class="kp-mono">db</span> subcommands are not available for security.
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
        </div>`}function ue(e,t){let s=e.querySelector("#wpcli-output"),a=e.querySelector("#wpcli-input"),n=e.querySelector("#wpcli-run"),i=e.querySelector("#wpcli-clear"),c=e.querySelector("#wpcli-status"),r=[],o=-1;function p(k,v=""){k.split(`
`).forEach(b=>{if(!b)return;let f=document.createElement("div");v?f.className=v:f.className=b.match(/error|fatal|critical/i)?"kp-log-line-err":b.match(/warning|warn/i)?"kp-log-line-warn":b.match(/success|done\]/i)?"kp-log-line-info":"",f.textContent=b,s.appendChild(f)}),s.scrollTop=s.scrollHeight}function u(k){if(k=k.trim(),!k)return;r.unshift(k),o=-1,p(`wp> ${k}`,"kp-log-line-info"),a.disabled=!0,n.disabled=!0,c&&(c.textContent="Running...");let v=location.protocol==="https:"?"wss":"ws",b=new WebSocket(`${v}://${location.host}/api/sites/${t}/wpcli`);b.onopen=()=>{b.send(JSON.stringify({command:k}))},b.onmessage=f=>{let x=f.data;if(x.trim()==="[done]"){b.close();return}if(x.startsWith("[info]")){p(x,"kp-muted");return}if(x.startsWith("[error]")){p(x,"kp-log-line-err");return}p(x)},b.onerror=()=>{p("[error] WebSocket connection failed","kp-log-line-err")},b.onclose=()=>{a.disabled=!1,n.disabled=!1,c&&(c.textContent="Ready"),a.focus()}}n.addEventListener("click",()=>{u(a.value),a.value=""}),a.addEventListener("keydown",k=>{if(k.key==="Enter"){u(a.value),a.value="",o=-1;return}if(k.key==="ArrowUp"){k.preventDefault(),o<r.length-1&&(o++,a.value=r[o]);return}k.key==="ArrowDown"&&(k.preventDefault(),o>0?(o--,a.value=r[o]):(o=-1,a.value=""))}),e.querySelectorAll('[data-action="wpcli-quick"]').forEach(k=>{k.addEventListener("click",()=>{let v=k.dataset.cmd;if(v.startsWith("search-replace")){a.value=v,a.focus();let b=v.indexOf("''")+1;a.setSelectionRange(b,b);return}u(v)})}),i.addEventListener("click",()=>{s.innerHTML=""});let g=m.go.bind(m);m.go=function(k,v={}){return g(k,v)},a.focus()}function xe(){return`
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">WAF Override</h3>
            <form id="waf-override-form" class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="kp-label" for="waf-override">Site Behaviour</label>
                    <select class="uk-select kp-select" id="waf-override" name="override">
                        <option value="0">Inherit global setting</option>
                        <option value="1">Force ON for this site</option>
                        <option value="2">Force OFF for this site</option>
                    </select>
                </div>
                <div class="uk-margin">
                    <label class="kp-label" for="waf-site-exclusions">Additional Rule Exclusions</label>
                    <textarea
                        class="uk-textarea kp-input kp-mono kp-waf-exclusions"
                        id="waf-site-exclusions"
                        name="exclusions"
                        rows="15"
                        placeholder="# Numeric = rule ID, text = tag name, one per line&#10;942100&#10;attack-xss"></textarea>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Merged on top of global exclusions. Useful for WooCommerce, contact forms, or file upload paths that trigger false positives.
                    </p>
                </div>
                <div class="uk-flex uk-flex-right uk-margin-top">
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save
                    </button>
                </div>
            </form>
        </div>`}async function Se(e){let t=document.getElementById("waf-tab-panel");if(t){t.innerHTML=xe();try{let s=await d.get(`/sites/${e}/waf`),a=document.getElementById("waf-override"),n=document.getElementById("waf-site-exclusions");a&&(a.value=String(s.Override??0)),n&&(n.value=s.Exclusions??"")}catch(s){l.error("Failed to load WAF settings: "+s.message)}}}function $e(e,t){e.addEventListener("submit",async s=>{if(s.target.id!=="waf-override-form")return;s.preventDefault();let a=s.target.querySelector('[type="submit"]'),n=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let i=new FormData(s.target),c={override:parseInt(i.get("override"),10),exclusions:i.get("exclusions").trim()};try{await d.put(`/sites/${t}/waf`,c),l.success("WAF override saved \u2014 engine recompiling in background")}catch(r){l.error(r.message)}finally{a.disabled=!1,a.innerHTML=n}})}async function me(e,{id:t}){let[{site:s,domains:a,sftp:n},i,c]=await Promise.all([d.get(`/sites/${t}`),d.get("/sites"),d.get(`/sites/${t}/configs`)]),r=s.SiteType===1||s.SiteType===2;e.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${i.map(o=>`<option value="${o.ID}" ${o.ID===s.ID?"selected":""}>${o.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${$(s.SiteStatus)}
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
            <li><a href="#">Varnish</a></li>
            <li><a href="#">Logs</a></li>
            <li><a href="#">Security</a></li>
            <li><a href="#">WAF</a></li>
            ${s.SiteType===1?'<li><a href="#">WP-CLI</a></li>':""}
            <li><a href="#">Backups</a></li>
        </ul>

        <ul class="uk-switcher">
            <li>${le(s,a??[],n)}</li>
            <li>${C(t,1,c[1])}</li>
            ${r?`<li>${C(t,2,c[2])}</li>`:""}
            <li>${C(t,3,c[3])}</li>
            <li>${C(t,4,c[4])}</li>
            <li>${te(t,c[5])}</li>
            <li>${ae(t,s.SiteType)}</li>
            <li>${R(t)}</li>
            <li id="waf-tab-panel"></li>
            ${s.SiteType===1?`<li>${pe(t)}</li>`:""}            
            <li>${Z(t)}</li>
        </ul>`,document.getElementById("sd-back").addEventListener("click",()=>m.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>_(s)),document.getElementById("sd-recreate").addEventListener("click",async()=>{y("Recreating Pod","Recreating containers for this site...");try{await d.post(`/sites/${t}/recreate`),h(),l.success("Pod recreated"),m.go("site-detail",{id:t})}catch(o){h(),l.error(o.message)}}),document.getElementById("sd-site-nav")?.addEventListener("change",o=>{m.go("site-detail",{id:o.target.value})}),e.querySelectorAll("[data-action]").forEach(o=>{o.addEventListener("click",async()=>{let p=o.dataset.action;if(p==="flush"){try{await d.post(`/sites/${t}/flush`),l.success("Caches flushed")}catch(g){l.error(g.message)}return}y(`${{start:"Starting",stop:"Stopping",restart:"Restarting",update:"Updating"}[p]??p} Pod`,"Please wait...");try{await d.post(`/sites/${t}/${p}`),h(),l.success(`Site ${p} successful`),m.go("site-detail",{id:t})}catch(g){h(),l.error(g.message)}})}),se(e,t),ce(e,t),ne(e,t),A(e),s.SiteType===1&&ue(e,t),T(e),$e(e,t),Se(t),de(e,t),ee(e,t),B(e,t),oe(a??[])}async function U(e){let t=document.getElementById("totp-qr-img"),s=document.getElementById("totp-qr-wrap");if(!t||!s)return;if(s.querySelectorAll(".totp-uri-text").forEach(n=>n.remove()),typeof QRCode<"u")try{let n=await new Promise((i,c)=>{QRCode.toDataURL(e,{width:220,margin:2},(r,o)=>{r?c(r):i(o)})});t.src=n,t.style.display="";return}catch{}let a=document.createElement("p");a.className="totp-uri-text kp-muted uk-text-small",a.style.wordBreak="break-all",a.textContent=e,s.appendChild(a)}function F(e){document.getElementById("kp-backup-codes-modal")?.remove();let s=`
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
`),i=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(n).then(()=>{i.textContent="Copied!"});else{let c=document.createElement("textarea");c.value=n,c.style.cssText="position:fixed;opacity:0",document.body.appendChild(c),c.select();try{document.execCommand("copy"),i.textContent="Copied!"}catch{}c.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{a.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),m.go("users")})}function ke(e){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let s=UIkit.modal("#kp-create-user-modal");s.show(),document.getElementById("create-user-form").addEventListener("submit",async a=>{a.preventDefault();let n=a.target.querySelector('[type="submit"]'),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let c=new FormData(a.target),r={fname:c.get("fname").trim(),lname:c.get("lname").trim(),uname:c.get("uname").trim(),email:c.get("email").trim(),phone:c.get("phone").trim(),password:c.get("password"),role:parseInt(c.get("role"))};try{let o=L(await d.post("/users",r));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",z(o)),l.success(`User '${o.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",Ee(o.id,s)}catch(o){l.error(o.message),n.disabled=!1,n.innerHTML=i}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function Ee(e,t){let s=()=>{t.hide(),document.getElementById("kp-create-user-modal")?.remove(),m.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",s),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let a=document.getElementById("cu-totp-setup-btn");a.disabled=!0,a.textContent="Setting up\u2026";try{let n=await d.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=n.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await U(n.uri)}catch(n){l.error(n.message),a.disabled=!1,a.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let a=document.getElementById("totp-confirm-code").value.trim();if(a.length!==6){l.error("Enter a 6-digit code");return}let n=document.getElementById("cu-totp-confirm-btn");n.disabled=!0;try{let i=await d.post(`/users/${e}/totp/confirm`,{code:a});t.hide(),document.getElementById("kp-create-user-modal")?.remove(),l.success("TOTP enabled"),i.backup_codes?.length?F(i.backup_codes):m.go("users")}catch(i){l.error(i.message),n.disabled=!1}})}async function be(e,t){document.getElementById("kp-edit-user-modal")?.remove();let s;try{s=L(await d.get(`/users/${t}`))}catch(p){l.error(p.message);return}let a=window.KP?.user?.role===99,n=`
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
        </div>`;document.body.insertAdjacentHTML("beforeend",n);let i=UIkit.modal("#kp-edit-user-modal");i.show(),document.getElementById("edit-user-form").addEventListener("submit",async p=>{p.preventDefault();let u=p.target.querySelector('[type="submit"]'),g=u.innerHTML;u.disabled=!0,u.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let k=new FormData(p.target),v={fname:k.get("fname").trim(),lname:k.get("lname").trim(),email:k.get("email").trim(),phone:k.get("phone").trim()};if(a){v.role=parseInt(k.get("role"));let f=k.get("uname");f&&(v.uname=f.trim())}let b=k.get("password");b&&(v.password=b);try{await d.put(`/users/${t}`,v),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),l.success("User updated"),m.go("users")}catch(f){l.error(f.message),u.disabled=!1,u.innerHTML=g}});let c=document.getElementById("totp-setup-btn");c&&c.addEventListener("click",async()=>{c.disabled=!0,c.textContent="Setting up\u2026";try{let p=await d.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=p.secret,document.getElementById("totp-setup-area").style.display="",await U(p.uri)}catch(p){l.error(p.message),c.disabled=!1,c.textContent="Enable TOTP"}});let r=document.getElementById("totp-confirm-btn");r&&r.addEventListener("click",async()=>{let p=document.getElementById("totp-confirm-code").value.trim();if(p.length!==6){l.error("Enter a 6-digit code");return}r.disabled=!0;try{let u=await d.post(`/users/${t}/totp/confirm`,{code:p});i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),l.success("TOTP enabled"),u.backup_codes?.length?F(u.backup_codes):m.go("users")}catch(u){l.error(u.message),r.disabled=!1}});let o=document.getElementById("totp-disable-btn");o&&o.addEventListener("click",async()=>{o.disabled=!0;try{await d.delete(`/users/${t}/totp`),l.success("TOTP disabled"),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),m.go("users")}catch(p){l.error(p.message),o.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function ge(e){if(!E()){e.innerHTML=S("Access denied");return}let t=await d.get("/users");e.innerHTML=`
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
                    ${t.map(s=>z(L(s))).join("")}
                </tbody>
            </table>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>ke(e)),Le(e)}function z(e){let t=e.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>';return`<tr data-user-id="${e.id}">
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
    </tr>`}function Le(e){e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="delete-user"]');if(!(!s||!await w("Delete User","Delete this user? This cannot be undone.")))try{await d.delete(`/users/${s.dataset.uid}`),s.closest("tr").remove(),l.success("User deleted")}catch(n){l.error(n.message)}}),e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="edit-user"]');s&&be(e,s.dataset.uid)})}m.register("dashboard",e=>G(e));m.register("sites",e=>Q(e));m.register("site-detail",(e,t)=>me(e,t));m.register("users",e=>ge(e));m.register("settings",e=>X(e));m.register("security",e=>Y(e));document.addEventListener("click",e=>{let t=e.target.closest("[data-view]");if(!t)return;e.preventDefault(),m.go(t.dataset.view);let s=document.getElementById("kp-offcanvas");s&&UIkit.offcanvas(s).hide()});document.addEventListener("click",async e=>{let t=e.target.closest("[data-action]");if(!t)return;e.stopPropagation();let{action:s,id:a}=t.dataset;switch(s){case"manage":m.go("site-detail",{id:a});break;case"start":await D(a,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await D(a,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await D(a,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await D(a,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"edit":{let n=await d.get(`/sites/${a}`);_(n.site);break}case"delete":await Te(a);break;case"update":await D(a,"update","Updating Images","Pulling latest container images - this may take a few minutes...");break;case"recreate":y("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await d.post(`/sites/${a}/recreate`),h(),l.success("Pod recreated"),m.go("site-detail",{id:a})}catch(n){h(),l.error(n.message)}break}});async function D(e,t,s,a){y(s,a);try{await d.post(`/sites/${e}/${t}`),h(),l.success(s+" complete"),["start","stop","restart"].includes(t)&&m.go("sites")}catch(n){h(),l.error(n.message)}}async function Te(e){if(!await w("Delete Site","This will stop and permanently remove the pod and all its data. Are you sure?"))return;y("Deleting Site","Stopping containers and removing the pod - please wait...");try{await d.delete(`/sites/${e}`)}catch{}let s=!1,a=0;for(;!s&&a<10;){try{await new Promise(i=>setTimeout(i,2e3)),s=!(await d.get("/sites")).find(i=>i.ID===parseInt(e))}catch{}a++}h(),s?(l.success("Site deleted"),m.go("sites")):l.error("Delete failed - site still exists after 20s")}window.addEventListener("hashchange",()=>{let{view:e,params:t}=j();m.go(e,t)});var{view:Pe,params:Be}=j();m.go(Pe,Be);})();
