"use strict";(()=>{var d={async _req(e,t,s,a=6e4){let n=new AbortController,i=setTimeout(()=>n.abort(),a),o={method:e,headers:{"Content-Type":"application/json"},signal:n.signal};s!==void 0&&(o.body=JSON.stringify(s));try{let r=await fetch("/api"+t,o);clearTimeout(i);let c=r.status===204?null:await r.json().catch(()=>null);if(r.status===401)return window.location.href="/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again",null;if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);return c}catch(r){throw clearTimeout(i),r}},get:e=>d._req("GET",e),post:(e,t)=>d._req("POST",e,t),put:(e,t)=>d._req("PUT",e,t),delete:e=>d._req("DELETE",e),patch:(e,t)=>d._req("PATCH",e,t)};var X=()=>'<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>',L=e=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${e}</div>
    </div>`,A=(e,t)=>`<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${e}; ratio: 2.5"></div>
        <div class="kp-empty-text">${t}</div>
    </div>`,C=e=>{let t={1:["running","Running"],2:["stopped","Stopped"],3:["restarting","Restarting"],4:["error","Error"]},[s,a]=t[e]||["stopped","Unknown"];return`<span class="kp-status kp-status-${s}">${a}</span>`},Te=e=>({3:"8.2",4:"8.3",5:"8.4",6:"8.5"})[e]||"?",N=e=>({1:"WordPress",2:"PHP",3:"Static",4:"Node.js",5:".NET",6:"Reverse Proxy"})[e]||"?",B=()=>window.KP.user.role===window.KP.roles.admin,q=e=>{switch(e.SiteType){case 1:case 2:return`PHP ${Te(e.PHPVersion)}`;case 4:return`Node ${{2:"22",4:"24",5:"25",6:"26"}[e.RuntimeVersion]||"?"}`;case 5:return`.NET ${{1:"8.0",2:"9.0",3:"10.0"}[e.RuntimeVersion]||"?"}`;case 6:return"Reverse Proxy";default:return""}},I=e=>({id:e.id??e.ID,uname:e.uname??e.UName,uhash:e.uhash??e.UHash,fname:e.fname??e.FName,lname:e.lname??e.LName,email:e.email??e.Email,phone:e.phone??e.Phone,role:e.role??e.Role,totp_enabled:e.totp_enabled??!1,created:e.created??e.Created});function x(e,t){return new Promise(s=>{document.getElementById("kp-confirm-title").textContent=e,document.getElementById("kp-confirm-message").textContent=t;let a=UIkit.modal("#kp-confirm-modal");document.getElementById("kp-confirm-ok").addEventListener("click",()=>{a.hide(),s(!0)},{once:!0}),a.show(),document.getElementById("kp-confirm-modal").addEventListener("hidden",()=>s(!1),{once:!0})})}function w(e,t){let s=`
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${e}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${t}</p>
                <p class="kp-muted">
                    This may take several minutes while images are pulled and containers are initialized.
                </p>
            </div>
        </div>`;document.body.insertAdjacentHTML("beforeend",s),UIkit.modal("#kp-progress-modal").show()}function y(){let e=document.getElementById("kp-progress-modal");e&&(UIkit.modal(e).hide(),setTimeout(()=>e.remove(),300))}var v={routes:{},register(e,t){this.routes[e]=t},async go(e,t={}){let s=Object.keys(t).length?e+"/"+Object.values(t).join("/"):e;window.location.hash=s,document.querySelectorAll(".kp-nav-link").forEach(i=>{i.classList.toggle("kp-active",i.dataset.view===e)});let a=this.routes[e];if(!a)return;let n=document.getElementById("kp-view");n.innerHTML=X();try{await a(n,t)}catch(i){n.innerHTML=L(i.message)}}};function K(){let t=(window.location.hash.replace("#","")||"dashboard").split("/"),s=t[0],a={};return s==="site-detail"&&t[1]&&(a.id=t[1]),{view:s,params:a}}var l={show(e,t="info",s=7e3){let a={success:"check",error:"warning",info:"info"},n=document.createElement("div");n.className=`kp-toast kp-toast-${t}`,n.innerHTML=`<span uk-icon="${a[t]||"info"}"></span><span>${e}</span>`,document.getElementById("kp-toasts").appendChild(n),UIkit.icon(n.querySelector("[uk-icon]")),setTimeout(()=>n.remove(),s)},success:e=>l.show(e,"success"),error:e=>l.show(e,"error"),info:e=>l.show(e,"info")};async function U(e){let t=`
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
                                <option value="6" ${e.SiteType===6?"selected":""}>Reverse Proxy</option>
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
        </div>`;document.body.insertAdjacentHTML("beforeend",t);let s=UIkit.modal("#kp-edit-site-modal"),a=document.getElementById("es-site-type"),n=document.getElementById("es-php-version-wrap"),i=document.getElementById("es-node-version-wrap"),o=document.getElementById("es-dotnet-version-wrap"),r=document.getElementById("es-start-command-wrap"),c=document.getElementById("es-wordpress-wrap");s.show();let u=p=>{n.classList.toggle("uk-hidden",p!==1&&p!==2||p===6),i.classList.toggle("uk-hidden",p!==4),o.classList.toggle("uk-hidden",p!==5),r.classList.toggle("uk-hidden",p!==4&&p!==5),c.classList.toggle("uk-hidden",p!==1)};u(e.SiteType),a.addEventListener("change",()=>u(parseInt(a.value))),document.getElementById("edit-site-form").addEventListener("submit",async p=>{p.preventDefault();let g=p.target.querySelector('[type="submit"]'),b=g.innerHTML;g.disabled=!0,g.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let m=new FormData(p.target),k=parseInt(m.get("site_type")),f=null;k===4&&(f=parseInt(m.get("node_version"))),k===5&&(f=parseInt(m.get("dotnet_version")));let h={name:m.get("name").trim(),php_version:parseInt(m.get("php_version"))||3,site_type:k,runtime_version:f,start_command:m.get("start_command")?.trim()||""},S=k===1?m.get("install_wordpress")==="on":!1;try{if(await d.put(`/sites/${e.ID}`,h),s.hide(),document.getElementById("kp-edit-site-modal")?.remove(),k!==6){w("Applying Changes","Saving changes and recreating pod...");try{await d.post(`/sites/${e.ID}/recreate`,{install_wordpress:S}),y(),l.success("Site updated and pod recreated")}catch($){y(),l.error("Site saved but pod recreate failed: "+$.message)}}else l.success("Site updated");v.go("site-detail",{id:String(e.ID)})}catch($){l.error($.message),g.disabled=!1,g.innerHTML=b}}),document.getElementById("kp-edit-site-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-site-modal")?.remove())}function F(){document.body.insertAdjacentHTML("beforeend",`
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
                                <option value="6">Reverse Proxy</option>
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
                        <div class="uk-width-1-1" id="cs-domains-wrap">
                            <label class="kp-label">Domains (one per line)</label>
                            <textarea class="uk-textarea kp-textarea" name="domains" rows="3" placeholder="example.com&#10;www.example.com"></textarea>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="cs-rp-note">
                            <p class="kp-muted uk-text-small">Configure domain \u2192 upstream mappings in the Routes tab after creation.</p>
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
        </div>`);let t=UIkit.modal("#kp-create-site-modal"),s=document.getElementById("cs-site-type"),a=document.getElementById("cs-php-version-wrap"),n=document.getElementById("cs-node-version-wrap"),i=document.getElementById("cs-dotnet-version-wrap"),o=document.getElementById("cs-start-command-wrap"),r=document.getElementById("cs-wordpress-wrap");t.show();let c=document.getElementById("cs-domains-wrap"),u=document.getElementById("cs-rp-note");s.addEventListener("change",()=>{let p=parseInt(s.value);a.classList.toggle("uk-hidden",p!==1&&p!==2||p===6),n.classList.toggle("uk-hidden",p!==4),i.classList.toggle("uk-hidden",p!==5),o.classList.toggle("uk-hidden",p!==4&&p!==5),r.classList.toggle("uk-hidden",p!==1||p===6),c.classList.toggle("uk-hidden",p===6),u.classList.toggle("uk-hidden",p!==6)}),document.getElementById("create-site-form").addEventListener("submit",async p=>{p.preventDefault();let g=p.target.querySelector('[type="submit"]'),b=g.innerHTML;g.disabled=!0,g.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let m=new FormData(p.target),k=parseInt(m.get("site_type")),f=null;k===4&&(f=parseInt(m.get("node_version"))),k===5&&(f=parseInt(m.get("dotnet_version")));let h={name:m.get("name").trim(),php_version:parseInt(m.get("php_version"))||3,site_type:k,runtime_version:f,start_command:m.get("start_command")?.trim()||"",domains:m.get("domains").split(`
`).map($=>$.trim()).filter(Boolean),install_wordpress:k===1?m.get("install_wordpress")==="on":!1};t.hide(),document.getElementById("kp-create-site-modal")?.remove();let S=k===6?`Setting up '${h.name}' as a reverse proxy...`:`Setting up '${h.name}' \u2014 pulling images and provisioning containers...`;w("Creating Site",S);try{await d.post("/sites",h),y(),l.success(`Site '${h.name}' created`),v.go("sites")}catch($){y(),l.error($.message),g.disabled=!1,g.innerHTML=b}}),document.getElementById("kp-create-site-modal").addEventListener("hidden",()=>document.getElementById("kp-create-site-modal")?.remove())}async function Z(e){let t=await d.get("/sites")??[];e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn">
                <span uk-icon="plus"></span> New Site
            </button>
        </div>
        <div class="kp-site-grid">
            ${t.length===0?A("world","No sites yet \u2014 create one to get started"):t.map(Q).join("")}
        </div>`,document.getElementById("sites-new-btn").addEventListener("click",()=>F())}function Q(e){let t=e.Domains?.[0]??null,s=e.SiteType===6;return`
        <div class="kp-site-card" data-site-id="${e.ID}" data-status="${e.SiteStatus}" data-type="${e.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${e.ID}">${e.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${e.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${N(e.SiteType)}${q(e)?" / "+q(e):""}</span>
                        ${t?`<span class="kp-site-meta-item" style="width:100%"><a href="http://${t}" target="_blank" style="color:var(--kp-cyan)">${t}</a></span>`:""}
                    </div>
                </div>
                ${s?"":C(e.SiteStatus)}
            </div>
            <div class="kp-site-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="manage" data-id="${e.ID}" uk-tooltip="Manage This Site"><span uk-icon="icon: settings;"></span></button>
                ${s?"":`
                ${e.SiteStatus===1?`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="stop" data-id="${e.ID}" uk-tooltip="Stop the Site"><span uk-icon="icon: ban;"></span></button>`:`<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="start" data-id="${e.ID}" uk-tooltip="Start the Site"><span uk-icon="icon: play;"></span></button>`}
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="restart" data-id="${e.ID}" uk-tooltip="Restart the Site"><span uk-icon="icon: refresh;"></span></button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="flush" data-id="${e.ID}" title="Flush cache" uk-tooltip="Flush the Caches"><span uk-icon="icon: bolt;"></span></button>
                <div class="kp-site-actions-break"></div>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="recreate" data-id="${e.ID}" title="Recreate pod" uk-tooltip="Recreate the Pod"><span uk-icon="icon: history;"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit" data-id="${e.ID}" title="Edit" uk-tooltip="Edit the Site"><span uk-icon="icon: pencil;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${e.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`}async function ee(e){let t=await d.get("/sites")??[],s=t.filter(i=>i.SiteStatus===1).length,a=t.filter(i=>i.SiteStatus===2).length,n=t.filter(i=>i.SiteStatus===4).length;e.innerHTML=`
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
            ${t.length===0?A("world","No sites yet"):t.slice(0,6).map(Q).join("")}
        </div>`,document.getElementById("dash-new-site")?.addEventListener("click",()=>F())}function j(e=null){let t=e?`/sites/${e}/security/ip`:"/security/ip",s=e?`/sites/${e}/security/ua`:"/security/ua",a=e?`/sites/${e}/waf`:"/settings/waf";return`
        <div id="security-panel" data-ip-base="${t}" data-ua-base="${s}" data-waf-base="${a}" ${e?`data-site-id="${e}"`:""}>

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

            ${e?"":`
            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Trusted Proxy Ranges</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/trusted-proxies/export" download="podnest-trusted-proxies.csv" uk-tooltip="Export trusted proxies">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import trusted proxies from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-tp-import" accept=".csv" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-tp-save" uk-tooltip="Save Trusted Proxy Ranges">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Custom IP ranges (one CIDR per line) to trust in addition to the
                    auto-fetched Cloudflare, Fastly, and CloudFront ranges.
                    <code>X-Forwarded-For</code> is only honoured when a request arrives
                    from one of these addresses.
                </p>
                <textarea class="uk-textarea kp-textarea kp-mono" id="sec-tp-cidrs" rows="15"
                    placeholder="192.168.1.0/24"></textarea>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    One IPv4 or IPv6 CIDR per line. Auto-fetched provider ranges are
                    managed automatically and do not need to be entered here.
                </p>
            </div>

            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Web Application Firewall</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/waf/export" download="podnest-waf-settings.json" uk-tooltip="Export WAF settings">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import WAF settings from JSON">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-waf-import" accept=".json" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-waf-save" uk-tooltip="Save WAF Settings">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
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
                <div class="uk-grid-small uk-margin-small-bottom" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <input class="uk-checkbox" type="checkbox" id="sec-waf-enabled">
                            &nbsp;Enable WAF (OWASP Core Rule Set)
                        </label>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <input class="uk-checkbox" type="checkbox" id="sec-waf-audit">
                            &nbsp;Enable Audit Log
                        </label>
                    </div>
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
            </div>
            `}

        </div>`}async function T(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,a=t.dataset.uaBase,n=t.dataset.wafBase;try{let i=[d.get(s),d.get(a)];t.dataset.siteId||i.push(d.get(n),d.get("/settings/trusted-proxies"));let[o,r,c,u]=await Promise.all(i);if(e.querySelector("#sec-ip-whitelist").value=o.whitelist??"",e.querySelector("#sec-ip-blacklist").value=o.blacklist??"",e.querySelector("#sec-ua-whitelist").value=r.whitelist??"",e.querySelector("#sec-ua-blacklist").value=r.blacklist??"",c){let p=e.querySelector("#sec-waf-enabled"),g=e.querySelector("#sec-waf-audit"),b=e.querySelector("#sec-waf-mode"),m=e.querySelector("#sec-waf-paranoia"),k=e.querySelector("#sec-waf-exclusions");p&&(p.checked=!!c.Enabled),g&&(g.checked=!!c.AuditLog),b&&(b.value=String(c.Mode??0)),m&&(m.value=String(c.ParanoiaLevel??1)),k&&(k.value=c.Exclusions??"")}if(u){let p=e.querySelector("#sec-tp-cidrs");p&&(p.value=u.trusted_proxies_custom??"")}}catch(i){l.error("Failed to load security rules: "+i.message)}}function W(e){let t=e.querySelector("#security-panel");if(!t)return;let s=t.dataset.ipBase,a=t.dataset.uaBase;e.querySelector("#sec-ip-save")?.addEventListener("click",async()=>{let n=e.querySelector("#sec-ip-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(s,{whitelist:e.querySelector("#sec-ip-whitelist").value,blacklist:e.querySelector("#sec-ip-blacklist").value}),l.success("IP rules saved")}catch(o){l.error(o.message)}finally{n.disabled=!1,n.innerHTML=i}}),e.querySelector("#sec-ua-save")?.addEventListener("click",async()=>{let n=e.querySelector("#sec-ua-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(a,{whitelist:e.querySelector("#sec-ua-whitelist").value,blacklist:e.querySelector("#sec-ua-blacklist").value}),l.success("UA rules saved")}catch(o){l.error(o.message)}finally{n.disabled=!1,n.innerHTML=i}}),e.querySelector("#sec-tp-save")?.addEventListener("click",async()=>{let n=e.querySelector("#sec-tp-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put("/settings/trusted-proxies",{trusted_proxies_custom:e.querySelector("#sec-tp-cidrs").value.trim()}),l.success("Trusted proxy ranges saved")}catch(o){l.error(o.message)}finally{n.disabled=!1,n.innerHTML=i}}),e.querySelector("#sec-tp-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let r=await fetch("/api/settings/trusted-proxies/import",{method:"POST",body:o}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await T(e),l.success("Trusted proxies imported")}catch(r){l.error(r.message)}finally{n.target.value=""}}),e.querySelector("#sec-waf-save")?.addEventListener("click",async()=>{let n=e.querySelector("#sec-waf-save"),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.put(t.dataset.wafBase,{enabled:e.querySelector("#sec-waf-enabled").checked,mode:parseInt(e.querySelector("#sec-waf-mode").value,10),paranoia_level:parseInt(e.querySelector("#sec-waf-paranoia").value,10),audit_log:e.querySelector("#sec-waf-audit").checked,exclusions:e.querySelector("#sec-waf-exclusions").value.trim()}),l.success("WAF settings saved \u2014 engine recompiling in background")}catch(o){l.error(o.message)}finally{n.disabled=!1,n.innerHTML=i}}),e.querySelector("#sec-ip-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let r=await fetch("/api"+s+"/import",{method:"POST",body:o}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await T(e),l.success("IP rules imported")}catch(r){l.error(r.message)}finally{n.target.value=""}}),e.querySelector("#sec-ua-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let r=await fetch("/api"+a+"/import",{method:"POST",body:o}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await T(e),l.success("UA rules imported")}catch(r){l.error(r.message)}finally{n.target.value=""}}),e.querySelector("#sec-waf-import")?.addEventListener("change",async n=>{let i=n.target.files[0];if(!i)return;let o=new FormData;o.append("file",i);try{let r=await fetch("/api/settings/waf/import",{method:"POST",body:o}),c=r.status===204?null:await r.json().catch(()=>null);if(!r.ok)throw new Error(c?.error||`HTTP ${r.status}`);await T(e),l.success("WAF settings imported")}catch(r){l.error(r.message)}finally{n.target.value=""}})}async function te(e){if(!B()){e.innerHTML=L("Access denied");return}e.innerHTML=`
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins \u2014 a blacklisted entry cannot be overridden by any whitelist.
        </p>
        ${j(null)}`,W(e),T(e)}function Pe(e){switch(e){case"valid":case"self-signed":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function se(e){let t=document.getElementById("admin-domain-ssl");if(!(!t||!e))try{let s=await d.get(`/ssl-status?domain=${encodeURIComponent(e)}`);t.outerHTML=Pe(s.status)}catch{}}async function ae(e){if(!B()){e.innerHTML=L("Access denied");return}let[t,s,a,n]=await Promise.all([d.get("/settings"),d.get("/settings/backup"),d.get("/settings/waf"),d.get("/settings/trusted-proxies")]);e.innerHTML=`
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
                    <div class="uk-flex uk-flex-right uk-margin-small-top" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/export" download="podnest-settings.csv" uk-tooltip="Export all settings">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import settings from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="settings-import" accept=".csv" style="display:none">
                        </label>
                    </div>
                </form>
            </div>
        </div>
        <div class="uk-width-1-1">
            <!-- leaving this here for future settings sections -->
        </div>
    </div>
    `,t.admin_domain&&se(t.admin_domain),document.getElementById("settings-form").addEventListener("submit",async i=>{i.preventDefault();let o=i.target.querySelector('[type="submit"]'),r=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let u={admin_domain:new FormData(i.target).get("admin_domain").trim()};try{await d.put("/settings",u),l.success("Settings saved"),se(u.admin_domain)}catch(p){l.error(p.message)}finally{o.disabled=!1,o.innerHTML=r}}),document.getElementById("settings-import").addEventListener("change",async i=>{let o=i.target.files[0];if(!o)return;let r=new FormData;r.append("file",o);try{let c=await fetch("/api/settings/import",{method:"POST",body:r}),u=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(u?.error||`HTTP ${c.status}`);l.success("Settings imported")}catch(c){l.error(c.message)}finally{i.target.value=""}}),document.getElementById("backup-form").addEventListener("submit",async i=>{i.preventDefault();let o=i.target.querySelector('[type="submit"]'),r=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let c=new FormData(i.target),u={backup_schedule:c.get("backup_schedule").trim(),backup_retain_days:c.get("backup_retain_days").trim()};try{await d.put("/settings/backup",u),l.success("Backup settings saved")}catch(p){l.error(p.message)}finally{o.disabled=!1,o.innerHTML=r}}),document.getElementById("s3-form").addEventListener("submit",async i=>{i.preventDefault();let o=i.target.querySelector('[type="submit"]'),r=o.innerHTML;o.disabled=!0,o.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let c=new FormData(i.target),u={s3_endpoint:c.get("s3_endpoint").trim(),s3_bucket:c.get("s3_bucket").trim(),s3_region:c.get("s3_region").trim(),s3_access_key:c.get("s3_access_key").trim()},p=c.get("s3_secret_key").trim();p&&(u.s3_secret_key=p);try{await d.put("/settings/backup",u),l.success("S3 settings saved")}catch(g){l.error(g.message)}finally{o.disabled=!1,o.innerHTML=r}})}function ne(e){return`
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

        </div>`}function Ce(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>';let t=n=>n===2?'<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>':'<span class="kp-mono" style="color:var(--kp-blue)">Local</span>',s=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:n<1073741824?`${(n/1048576).toFixed(1)} MB`:`${(n/1073741824).toFixed(2)} GB`;return`
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
        </table>`}async function D(e,t){try{let[s,a]=await Promise.all([d.get(`/sites/${t}/backup-repo`),d.get(`/sites/${t}/backups`)]),n=e.querySelector("#backup-local-enabled"),i=e.querySelector("#backup-s3-enabled");n&&(n.checked=!!s.LocalEnabled),i&&(i.checked=!!s.S3Enabled);let o=e.querySelector("#backup-error-banner");if(o)if(s.last_error){let c=s.last_error_at?` (${new Date(s.last_error_at).toLocaleString()})`:"";o.innerHTML=`
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${c}:</strong> ${s.last_error}</p>
                    </div>`}else o.innerHTML="";let r=e.querySelector("#backup-list-wrap");r&&(r.innerHTML=Ce(a))}catch(s){let a=e.querySelector("#backup-list-wrap");a&&(a.innerHTML=`<p class="kp-muted uk-text-small">Failed to load backups: ${s.message}</p>`)}}function ie(e,t){e.querySelector("#backup-repo-save")?.addEventListener("click",async()=>{let s={local_enabled:e.querySelector("#backup-local-enabled")?.checked??!1,s3_enabled:e.querySelector("#backup-s3-enabled")?.checked??!1};try{await d.put(`/sites/${t}/backup-repo`,s),l.success("Backup destinations saved")}catch(a){l.error(a.message)}}),e.querySelector("#backup-run-btn")?.addEventListener("click",async()=>{let s=0;try{s=(await d.get(`/sites/${t}/backups`))?.length??0}catch{}try{await d.post(`/sites/${t}/backups`,{label:"manual"})}catch(i){l.error(i.message);return}w("Backup Running","Snapshotting files and database \u2014 this may take a few minutes.");let a=Date.now()+600*1e3,n=setInterval(async()=>{try{(((await d.get(`/sites/${t}/backups`))?.length??0)>s||Date.now()>a)&&(clearInterval(n),y(),await D(e,t),Date.now()<=a&&l.success("Backup complete"))}catch{}},4e3)}),e.querySelector("#backup-list-wrap")?.addEventListener("click",async s=>{let a=s.target.closest(".backup-restore-btn");if(a){let o=a.dataset.id;if(!await x("Restore Site","This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"))return;try{await d.post(`/sites/${t}/backups/${o}/restore`)}catch(g){l.error(g.message);return}w("Restore Running","Restoring files and database \u2014 the site will return automatically when complete.");let c=Date.now(),u=Date.now()+900*1e3,p=setInterval(async()=>{try{let g=await d.get(`/sites/${t}/backups/restore-status`);(!g?.active||Date.now()>u)&&(clearInterval(p),y(),g?.active?l.error("Restore timed out"):l.success("Restore complete"),await D(e,t))}catch{}},3e3);return}let n=s.target.closest(".backup-delete-btn");if(n){let o=n.dataset.id;if(!await x("Delete Snapshot","This will permanently remove the snapshot from all configured repositories. This cannot be undone."))return;w("Deleting Snapshot","Removing snapshot data from repositories \u2014 this may take a moment.");try{await d.delete(`/sites/${t}/backups/${o}`),y(),l.success("Snapshot deleted"),await D(e,t)}catch(c){y(),l.error(c.message)}}let i=s.target.closest(".backup-download-btn");if(i){let o=i.dataset.id;w("Preparing Download","Your backup archive is being generated \u2014 this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."),setTimeout(()=>{let r=document.createElement("a");r.href=`/api/sites/${t}/backups/${o}/download`,r.style.display="none",document.body.appendChild(r),r.click(),document.body.removeChild(r),setTimeout(()=>{y()},5e3)},300);return}})}var O={1:"Nginx",2:"PHP",3:"MariaDB",4:"Redis",5:"Varnish"};function H(e,t,s){let a=s?Object.entries(s):[];return`
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
                ${a.map(([n,i])=>M(n,i)).join("")}
            </div>
        </div>`}function oe(e,t){let s=t?.enabled==="true",a=t?Object.entries(t).filter(([n])=>n!=="enabled"):[];return`
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
                ${a.map(([n,i])=>M(n,i)).join("")}
            </div>
        </div>`}function M(e="",t=""){return`<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${e}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${t}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function le(e,t){e.addEventListener("click",s=>{if(s.target.closest(".cfg-add-row")){let a=s.target.closest(".cfg-add-row");e.querySelector(`.cfg-rows[data-type="${a.dataset.type}"]`).insertAdjacentHTML("beforeend",M())}}),e.addEventListener("click",s=>{s.target.closest(".cfg-del-row")&&s.target.closest(".kp-config-row").remove()}),e.addEventListener("click",async s=>{let a=s.target.closest(".cfg-save");if(!a)return;let{type:n,site:i}=a.dataset,o=e.querySelectorAll(`.cfg-rows[data-type="${n}"] .kp-config-row`),r={};if(o.forEach(c=>{let u=c.querySelector(".cfg-key").value.trim(),p=c.querySelector(".cfg-val").value.trim();u&&(r[u]=p)}),n==="5"){let c=e.querySelector(".varnish-enabled-toggle");r.enabled=c?.checked?"true":"false"}try{await d.put(`/sites/${i}/configs/${n}`,r),l.success(`${O[n]} config saved`)}catch(c){l.error(c.message)}}),e.addEventListener("click",async s=>{let a=s.target.closest(".cfg-reset");if(!a)return;let{type:n,site:i}=a.dataset;if(await x("Reset Config",`Reset ${O[n]} config to defaults?`))try{let r=await d.post(`/sites/${i}/configs/${n}/reset`),c=e.querySelector(`.cfg-rows[data-type="${n}"]`);c.innerHTML=Object.entries(r).map(([u,p])=>M(u,p)).join(""),l.success(`${O[n]} reset to defaults`)}catch(r){l.error(r.message)}}),e.addEventListener("change",async s=>{let a=s.target.closest(".cfg-import-input");if(!a)return;let{type:n,site:i}=a.dataset,o=a.files[0];if(!o)return;let r=new FormData;r.append("file",o);try{let c=await fetch(`/api/sites/${i}/configs/${n}/import`,{method:"POST",body:r}),u=c.status===204?null:await c.json().catch(()=>null);if(!c.ok)throw new Error(u?.error||`HTTP ${c.status}`);let p=e.querySelector(`.cfg-rows[data-type="${n}"]`);p.innerHTML=Object.entries(u).map(([g,b])=>M(g,b)).join(""),l.success(`${O[n]} config imported`)}catch(c){l.error(c.message)}finally{a.value=""}})}function ce(e){return`
        <div id="crons-panel" data-site-id="${e}">
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Cron Jobs</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="cron-add-btn" uk-tooltip="Add Cron Job">
                        <span uk-icon="plus"></span>
                    </button>
                </div>
                <div id="cron-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>

            <!-- add / edit modal -->
            <div id="cron-modal" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title" id="cron-modal-title">Add Cron Job</h3>
                    <div class="uk-form-stacked uk-margin-top">
                        <div class="uk-grid-small" uk-grid>
                            <input type="hidden" id="cron-modal-id">
                            <div class="uk-width-1-1">
                                <label class="kp-label">Label</label>
                                <input class="uk-input kp-input" type="text" id="cron-modal-label" placeholder="e.g. Daily cleanup">
                            </div>
                            <div class="uk-width-1-1">
                                <label class="kp-label">Command</label>
                                <textarea class="uk-textarea kp-textarea kp-mono" id="cron-modal-command" rows="3"
                                    placeholder="e.g. php /var/www/html/artisan schedule:run"></textarea>
                            </div>
                            <div class="uk-width-1-1">
                                <label class="kp-label">Schedule <span class="kp-muted uk-text-small">(5-field cron expression)</span></label>
                                <input class="uk-input kp-input kp-mono" type="text" id="cron-modal-schedule" placeholder="e.g. 0 3 * * *">
                                <p class="kp-muted uk-text-small uk-margin-small-top uk-margin-remove-bottom" id="cron-schedule-preview"></p>
                            </div>
                            <div class="uk-width-1-1">
                                <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                                    <input type="checkbox" class="uk-checkbox" id="cron-modal-enabled" checked>
                                    <span class="kp-text">Enabled</span>
                                </label>
                            </div>
                        </div>
                        <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                            <button class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                            <button class="uk-button kp-btn-primary" id="cron-modal-save">Save</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>`}function de(e){if(!e||e.length===0)return'<p class="kp-muted uk-text-small uk-margin-remove">No cron jobs configured.</p>';let t=a=>a?new Date(a).toLocaleString():"\u2014";return`
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead>
                <tr>
                    <th>Label</th>
                    <th>Schedule</th>
                    <th>Last Run</th>
                    <th>Status</th>
                    <th>Enabled</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${e.map(a=>`
        <tr>
            <td class="kp-text">${a.Label||'<span class="kp-muted">\u2014</span>'}</td>
            <td class="kp-mono" style="font-size:0.8rem">${a.Schedule}</td>
            <td class="kp-muted uk-text-small">${t(a.LastRun)}</td>
            <td>
                ${a.LastError?`<span class="kp-badge kp-badge-error" uk-tooltip="${Be(a.LastError)}">Error</span>`:a.LastRun?'<span class="kp-badge kp-badge-success">OK</span>':'<span class="kp-muted uk-text-small">\u2014</span>'}
            </td>
            <td>
                <input type="checkbox" class="uk-checkbox cron-toggle"
                    data-id="${a.ID}" ${a.Enabled?"checked":""}>
            </td>
            <td>
                <div class="uk-flex" style="gap:6px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-run-btn"
                        data-id="${a.ID}" uk-tooltip="Run Now">
                        <span uk-icon="play"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-edit-btn"
                        data-id="${a.ID}" uk-tooltip="Edit">
                        <span uk-icon="pencil"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm cron-delete-btn"
                        data-id="${a.ID}" uk-tooltip="Delete">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("")}</tbody>
        </table>`}async function V(e,t){let s=e.querySelector("#cron-list-wrap");if(s)try{let a=await d.get(`/sites/${t}/crons`);s.innerHTML=de(a)}catch(a){s.innerHTML=`<p class="kp-muted uk-text-small">Failed to load cron jobs: ${a.message}</p>`}}function pe(e,t){let s=[],a=e.querySelector("#cron-modal"),n=e.querySelector("#cron-modal-title"),i=e.querySelector("#cron-modal-id"),o=e.querySelector("#cron-modal-label"),r=e.querySelector("#cron-modal-command"),c=e.querySelector("#cron-modal-schedule"),u=e.querySelector("#cron-schedule-preview"),p=e.querySelector("#cron-modal-enabled");c?.addEventListener("input",()=>{u.textContent=re(c.value.trim())}),e.querySelector("#cron-add-btn")?.addEventListener("click",()=>{n.textContent="Add Cron Job",i.value="",o.value="",r.value="",c.value="",u.textContent="",p.checked=!0,UIkit.modal(a).show()}),e.querySelector("#cron-modal-save")?.addEventListener("click",async()=>{let g=r.value.trim(),b=c.value.trim();if(!g||!b){l.error("Command and schedule are required");return}let m={label:o.value.trim(),command:g,schedule:b,enabled:p.checked},k=i.value;try{k?(await d.put(`/sites/${t}/crons/${k}`,m),l.success("Cron job updated")):(await d.post(`/sites/${t}/crons`,m),l.success("Cron job created")),UIkit.modal(a).hide(),await V(e,t),s=await d.get(`/sites/${t}/crons`)}catch(f){l.error(f.message)}}),e.querySelector("#cron-list-wrap")?.addEventListener("click",async g=>{let b=g.target.closest(".cron-edit-btn");if(b){let f=b.dataset.id,h=s.find(S=>String(S.ID)===f);if(!h)return;n.textContent="Edit Cron Job",i.value=h.ID,o.value=h.Label||"",r.value=h.Command,c.value=h.Schedule,u.textContent=re(h.Schedule),p.checked=h.Enabled,UIkit.modal(a).show();return}let m=g.target.closest(".cron-delete-btn");if(m){let f=m.dataset.id;if(!await x("Delete Cron Job","This will permanently remove the cron job. Continue?"))return;try{await d.delete(`/sites/${t}/crons/${f}`),l.success("Cron job deleted"),await V(e,t),s=await d.get(`/sites/${t}/crons`)}catch(S){l.error(S.message)}return}let k=g.target.closest(".cron-run-btn");if(k){let f=k.dataset.id;try{await d.post(`/sites/${t}/crons/${f}/run`)}catch(E){l.error(E.message);return}w("Running Cron Job","Executing the job inside the container \u2014 please wait.");let h=null;try{h=(await d.get(`/sites/${t}/crons`)).find(P=>String(P.ID)===f)?.LastRun??null}catch{}let S=Date.now()+300*1e3,$=setInterval(async()=>{try{let E=await d.get(`/sites/${t}/crons`),P=E.find(_=>String(_.ID)===f);if(!P||P.LastRun!==h||Date.now()>S){clearInterval($),y(),s=E??[];let _=e.querySelector("#cron-list-wrap");_&&(_.innerHTML=de(E)),P?.LastError?l.error(`Job failed: ${P.LastError}`):l.success("Cron job complete")}}catch{}},2e3);return}}),e.querySelector("#cron-list-wrap")?.addEventListener("change",async g=>{let b=g.target.closest(".cron-toggle");if(!b)return;let m=b.dataset.id;try{await d.patch(`/sites/${t}/crons/${m}/toggle`,{enabled:b.checked}),l.success(b.checked?"Cron job enabled":"Cron job disabled")}catch(k){l.error(k.message),b.checked=!b.checked}}),d.get(`/sites/${t}/crons`).then(g=>{s=g??[]}).catch(()=>{})}function Be(e){return String(e).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function re(e){if(!e)return"";let t=e.trim().split(/\s+/);if(t.length!==5)return"invalid expression";let[s,a,n,i,o]=t;if(e==="* * * * *")return"every minute";if(s!=="*"&&a!=="*"&&n==="*"&&i==="*"&&o==="*")return`daily at ${a.padStart(2,"0")}:${s.padStart(2,"0")}`;if(s!=="*"&&a!=="*"&&n==="*"&&i==="*"&&o!=="*"){let r=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];return`weekly on ${o.split(",").map(u=>r[parseInt(u)]??u).join(", ")} at ${a.padStart(2,"0")}:${s.padStart(2,"0")}`}return s.startsWith("*/")?`every ${s.slice(2)} minutes`:a.startsWith("*/")?`every ${a.slice(2)} hours`:e}function ue(e,t){return`
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
        </div>`}function me(e,t){let s=null,a=!1,n=e.querySelector("#log-output"),i=e.querySelector("#log-connect"),o=e.querySelector("#log-disconnect"),r=e.querySelector("#log-clear"),c=e.querySelector("#log-autoscroll"),u=e.querySelector("#log-status");function p(m){m.split(`
`).forEach(k=>{if(!k)return;let f=document.createElement("div");f.className=k.match(/WAF BLOCK/i)?"kp-log-line-err":k.match(/WAF DETECT/i)?"kp-log-line-warn":k.match(/error|crit|emerg/i)?"kp-log-line-err":k.match(/warn/i)?"kp-log-line-warn":k.match(/info|notice/i)?"kp-log-line-info":"",f.textContent=k,n.appendChild(f)}),c.checked&&(n.scrollTop=n.scrollHeight)}function g(){s&&(s.close(),s=null),a=!1,i.disabled=!1,o.disabled=!0,u&&(u.textContent="Disconnected")}i.addEventListener("click",()=>{g();let m=e.querySelector("#log-container").value,k=e.querySelector("#log-tail").value,f=location.protocol==="https:"?"wss":"ws",h=m==="waf"?`${f}://${location.host}/api/sites/${t}/logs/waf?tail=${k}`:`${f}://${location.host}/api/sites/${t}/logs?container=${m}&tail=${k}`;s=new WebSocket(h),s.onopen=()=>{a=!0,i.disabled=!0,o.disabled=!1,u&&(u.textContent=`Connected \u2014 ${m}`)},s.onmessage=S=>p(S.data),s.onerror=()=>{},s.onclose=()=>{a=!1,i.disabled=!1,o.disabled=!0,u&&(u.textContent="Disconnected")}}),o.addEventListener("click",g),r.addEventListener("click",()=>{n.innerHTML=""}),e.querySelector("#log-container").addEventListener("change",()=>{s&&s.readyState===WebSocket.OPEN&&(g(),i.click())});let b=v.go.bind(v);v.go=function(m,k={}){return s&&g(),b(m,k)}}function Ie(e){switch(e){case"valid":return'<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>';case"self-signed":return'<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>';default:return'<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>'}}async function ke(e,t){try{let s=await d.get(`/ssl-status?domain=${encodeURIComponent(e)}`),a=document.getElementById(`ssl-icon-${t}`);a&&(a.outerHTML=Ie(s.status))}catch{}}function be(e){e.forEach(t=>ke(t.Domain,t.ID))}function ge(e,t,s){let a=e.SiteType!==3&&e.PMAPort>0;return`
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${e.Name}</td></tr>
                            <tr><td class="kp-muted">Internal Port</td><td>:${e.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${N(e.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${q(e)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${C(e.SiteStatus)}</td></tr>
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
                        ${t.length?t.map(ve).join(""):'<p class="kp-muted uk-text-small">No domains configured</p>'}
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
        </div>`}function ve(e){return`<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${e.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${e.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${e.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${e.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`}function fe(e,t){e.querySelector("#domain-add-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.remove("uk-hidden")}),e.querySelector("#domain-cancel-btn")?.addEventListener("click",()=>{e.querySelector("#domain-add-form").classList.add("uk-hidden")}),e.querySelector("#domain-save-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#domain-add-input").value.trim();if(s)try{let a=await d.post(`/sites/${t}/domains`,{domain:s});e.querySelector("#domain-list").insertAdjacentHTML("beforeend",ve(a)),ke(a.Domain,a.ID),e.querySelector("#domain-add-form").classList.add("uk-hidden"),e.querySelector("#domain-add-input").value="",l.success("Domain added")}catch(a){l.error(a.message)}}),e.querySelector("#domain-list")?.addEventListener("click",async s=>{let a=s.target.closest('[data-action="delete-domain"]');if(!(!a||!await x("Remove Domain","Remove this domain from the site?")))try{await d.delete(`/sites/${t}/domains/${a.dataset.did}`),a.closest("[data-domain-id]").remove(),l.success("Domain removed")}catch(i){l.error(i.message)}})}function he(e,t){e.querySelector("#sftp-regen-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#sftp-regen-btn"),a=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div>';try{await d.post(`/sites/${t}/sftp-regen`),l.success("SFTP password regenerated"),v.go("site-detail",{id:String(t)})}catch(n){l.error(n.message),s.disabled=!1,s.innerHTML=a}}),e.querySelector("#sftp-copy-btn")?.addEventListener("click",()=>{let s=e.querySelector("#sftp-pass-display")?.textContent;if(s)if(navigator.clipboard)navigator.clipboard.writeText(s).then(()=>l.success("Password copied to clipboard")).catch(()=>l.error("Failed to copy password"));else{let a=document.createElement("textarea");a.value=s,a.style.cssText="position:fixed;opacity:0",document.body.appendChild(a),a.select(),document.execCommand("copy"),document.body.removeChild(a),l.success("Password copied to clipboard")}}),e.querySelector("#pma-open-btn")?.addEventListener("click",async()=>{let s=e.querySelector("#pma-open-btn"),a=s.innerHTML;s.disabled=!0,s.innerHTML='<div uk-spinner="ratio: 0.5"></div> Opening...';try{let n=await d.post(`/sites/${t}/pma-token`);window.open(n.url,"_blank")}catch(n){l.error(n.message)}finally{s.disabled=!1,s.innerHTML=a}})}var qe=[{label:"Cache Flush",cmd:"cache flush"},{label:"Plugin List",cmd:"plugin list"},{label:"Theme List",cmd:"theme list"},{label:"User List",cmd:"user list"},{label:"Core Check",cmd:"core check-update"},{label:"Core Update",cmd:"core update"},{label:"Plugin Updates",cmd:"plugin update --all"},{label:"Theme Updates",cmd:"theme update --all"},{label:"Rewrite Flush",cmd:"rewrite flush"},{label:"Transient Delete",cmd:"transient delete --all"},{label:"Search Replace",cmd:"search-replace '' ''"}];function ye(e){return`
        <div>
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${qe.map(t=>`
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
        </div>`}function we(e,t){let s=e.querySelector("#wpcli-output"),a=e.querySelector("#wpcli-input"),n=e.querySelector("#wpcli-run"),i=e.querySelector("#wpcli-clear"),o=e.querySelector("#wpcli-status"),r=[],c=-1;function u(b,m=""){b.split(`
`).forEach(k=>{if(!k)return;let f=document.createElement("div");m?f.className=m:f.className=k.match(/error|fatal|critical/i)?"kp-log-line-err":k.match(/warning|warn/i)?"kp-log-line-warn":k.match(/success|done\]/i)?"kp-log-line-info":"",f.textContent=k,s.appendChild(f)}),s.scrollTop=s.scrollHeight}function p(b){if(b=b.trim(),!b)return;r.unshift(b),c=-1,u(`wp> ${b}`,"kp-log-line-info"),a.disabled=!0,n.disabled=!0,o&&(o.textContent="Running...");let m=location.protocol==="https:"?"wss":"ws",k=new WebSocket(`${m}://${location.host}/api/sites/${t}/wpcli`);k.onopen=()=>{k.send(JSON.stringify({command:b}))},k.onmessage=f=>{let h=f.data;if(h.trim()==="[done]"){k.close();return}if(h.startsWith("[info]")){u(h,"kp-muted");return}if(h.startsWith("[error]")){u(h,"kp-log-line-err");return}u(h)},k.onerror=()=>{u("[error] WebSocket connection failed","kp-log-line-err")},k.onclose=()=>{a.disabled=!1,n.disabled=!1,o&&(o.textContent="Ready"),a.focus()}}n.addEventListener("click",()=>{p(a.value),a.value=""}),a.addEventListener("keydown",b=>{if(b.key==="Enter"){p(a.value),a.value="",c=-1;return}if(b.key==="ArrowUp"){b.preventDefault(),c<r.length-1&&(c++,a.value=r[c]);return}b.key==="ArrowDown"&&(b.preventDefault(),c>0?(c--,a.value=r[c]):(c=-1,a.value=""))}),e.querySelectorAll('[data-action="wpcli-quick"]').forEach(b=>{b.addEventListener("click",()=>{let m=b.dataset.cmd;if(m.startsWith("search-replace")){a.value=m,a.focus();let k=m.indexOf("''")+1;a.setSelectionRange(k,k);return}p(m)})}),i.addEventListener("click",()=>{s.innerHTML=""});let g=v.go.bind(v);v.go=function(b,m={}){return g(b,m)},a.focus()}function De(){return`
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
                    <label class="kp-label">CRS Plugins</label>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Select OWASP CRS plugins to enable for this site. Only plugins present in the
                        local CRS install are shown. Changes recompile the site WAF engine in the background.
                    </p>
                    <div id="waf-plugins-list" class="uk-margin-small-top">
                        <span class="kp-muted uk-text-small">Loading available plugins\u2026</span>
                    </div>
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
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <a class="uk-button kp-btn-ghost" id="waf-export-btn" href="#" uk-tooltip="Export WAF settings">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost" style="cursor:pointer" uk-tooltip="Import WAF settings">
                        <span uk-icon="upload"></span>
                        <input type="file" id="waf-import" accept=".json" style="display:none">
                    </label>
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save
                    </button>
                </div>
            </form>
        </div>`}function Me(e){let t=e.querySelector(".kp-tab-bar");if(!t)return;let s=Array.from(t.querySelectorAll(":scope > li > a"));if(!s.length)return;let a=document.createElement("div");a.className="kp-tab-select-wrap",a.innerHTML='<span uk-icon="chevron-down"></span>';let n=document.createElement("select");n.className="kp-tab-select",s.forEach((i,o)=>{let r=document.createElement("option");r.value=o,r.textContent=i.textContent.trim(),n.appendChild(r)}),a.insertBefore(n,a.firstChild),t.parentNode.insertBefore(a,t),n.addEventListener("change",()=>{UIkit.tab(t).show(parseInt(n.value,10))}),UIkit.util.on(t,"shown",i=>{let o=i.target,c=Array.from(t.querySelectorAll(":scope > li")).indexOf(o);c!==-1&&(n.value=c)})}async function xe(e){let t=document.getElementById("waf-tab-panel");if(!t)return;t.innerHTML=De();let s=document.getElementById("waf-export-btn");s&&(s.href=`/api/sites/${e}/waf/export`);try{let a=await d.get(`/sites/${e}/waf`),n=document.getElementById("waf-override"),i=document.getElementById("waf-site-exclusions");n&&(n.value=String(a.Override??0)),i&&(i.value=a.Exclusions??"");let o=document.getElementById("waf-plugins-list");if(o){let[r,c]=await Promise.all([d.get("/settings/waf/plugins"),d.get(`/sites/${e}/waf/plugins`)]),u=new Set(c??[]);!r||r.length===0?o.innerHTML='<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>':(o.innerHTML=`
                    <div class="waf-plugin-pills">
                        ${r.map(p=>`
                        <span class="waf-plugin-pill ${u.has(p)?"active":""}"
                            data-plugin="${p}">${p}</span>
                        `).join("")}
                    </div>`,o.querySelectorAll(".waf-plugin-pill").forEach(p=>{p.addEventListener("click",()=>p.classList.toggle("active"))}))}}catch(a){l.error("Failed to load WAF settings: "+a.message)}}function He(e,t){e.addEventListener("submit",async s=>{if(s.target.id!=="waf-override-form")return;s.preventDefault();let a=s.target.querySelector('[type="submit"]'),n=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let i=new FormData(s.target),o={override:parseInt(i.get("override"),10),exclusions:i.get("exclusions").trim()};try{await d.put(`/sites/${t}/waf`,o);let r=[...document.querySelectorAll(".waf-plugin-pill.active")].map(c=>c.dataset.plugin);await d.put(`/sites/${t}/waf/plugins`,r),l.success("WAF override saved \u2014 engine recompiling in background")}catch(r){l.error(r.message)}finally{a.disabled=!1,a.innerHTML=n}}),e.querySelector("#waf-import")?.addEventListener("change",async s=>{let a=s.target.files[0];if(!a)return;let n=new FormData;n.append("file",a);try{let i=await fetch(`/api/sites/${t}/waf/import`,{method:"POST",body:n}),o=i.status===204?null:await i.json().catch(()=>null);if(!i.ok)throw new Error(o?.error||`HTTP ${i.status}`);await xe(t),l.success("WAF settings imported")}catch(i){l.error(i.message)}finally{s.target.value=""}})}function Re(){return`
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">Upstream Routes</h3>
            <p class="kp-muted uk-text-small uk-margin-bottom">
                Each domain maps to one or more upstream URLs. Multiple upstreams for the same
                domain are load-balanced via round-robin.
            </p>
            <div id="rp-routes-list"></div>
            <button class="uk-button kp-btn-ghost uk-margin-small-top" id="rp-add-row">
                <span uk-icon="plus"></span> Add Route
            </button>
            <div class="uk-flex uk-flex-right uk-margin-top">
                <button class="uk-button kp-btn-primary" id="rp-save-btn">
                    <span uk-icon="check"></span> Save Routes
                </button>
            </div>
        </div>`}function G(e="",t=""){return`
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${e}" data-field="domain">
            <input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${t}" data-field="upstream">
            <button class="uk-button kp-btn-ghost kp-btn-sm rp-remove-row" uk-tooltip="Remove"><span uk-icon="trash"></span></button>
        </div>`}async function _e(e){let t=document.getElementById("rp-routes-list");if(t)try{let s=await d.get(`/sites/${e}/rp-routes`);t.innerHTML=s.length?s.map(a=>G(a.Domain,a.Upstream)).join(""):G()}catch(s){l.error("Failed to load routes: "+s.message)}}function Ae(e,t){e.addEventListener("click",async s=>{if(s.target.closest("#rp-add-row")){document.getElementById("rp-routes-list").insertAdjacentHTML("beforeend",G());return}if(s.target.closest(".rp-remove-row")){s.target.closest(".rp-route-row").remove();return}if(!s.target.closest("#rp-save-btn"))return;let a=s.target.closest("#rp-save-btn"),n=a.innerHTML;a.disabled=!0,a.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let i=[...document.querySelectorAll(".rp-route-row")].map(o=>({Domain:o.querySelector('[data-field="domain"]').value.trim(),Upstream:o.querySelector('[data-field="upstream"]').value.trim()})).filter(o=>o.Domain&&o.Upstream);try{await d.put(`/sites/${t}/rp-routes`,i),l.success("Routes saved")}catch(o){l.error(o.message)}finally{a.disabled=!1,a.innerHTML=n}})}async function Se(e,{id:t}){let[{site:s,domains:a,sftp:n},i,o]=await Promise.all([d.get(`/sites/${t}`),d.get("/sites"),d.get(`/sites/${t}/configs`)]),r=s.SiteType===1||s.SiteType===2,c=s.SiteType===6,u=[1,2,4,5].includes(s.SiteType);if(e.innerHTML=`
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${i.map(p=>`<option value="${p.ID}" ${p.ID===s.ID?"selected":""}>${p.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${c?"":C(s.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                ${c?"":`
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${t}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${t}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${t}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${t}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="update" data-id="${t}" uk-tooltip="Update the Pod Images"><span uk-icon="cloud-upload"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-recreate" uk-tooltip="Recreate the Pod"><span uk-icon="history"></span></button>
                `}
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>

        ${c?`
        <ul uk-tab class="uk-margin-medium-bottom kp-tab-bar">
            <li><a href="#">Routes</a></li>
        </ul>
        <ul class="uk-switcher">
            <li>${Re()}</li>
        </ul>
        `:`
        <ul uk-tab class="uk-margin-medium-bottom kp-tab-bar">
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
            ${u?'<li><a href="#">Crons</a></li>':""}
        </ul>

        <ul class="uk-switcher">
            <li>${ge(s,a??[],n)}</li>
            <li>${H(t,1,o[1])}</li>
            ${r?`<li>${H(t,2,o[2])}</li>`:""}
            <li>${H(t,3,o[3])}</li>
            <li>${H(t,4,o[4])}</li>
            <li>${oe(t,o[5])}</li>
            <li>${ue(t,s.SiteType)}</li>
            <li>${j(t)}</li>
            <li id="waf-tab-panel"></li>
            ${s.SiteType===1?`<li>${ye(t)}</li>`:""}
            <li>${ne(t)}</li>
            ${u?`<li>${ce(t)}</li>`:""}
        </ul>`}`,document.getElementById("sd-back").addEventListener("click",()=>v.go("sites")),document.getElementById("sd-edit").addEventListener("click",()=>U(s)),document.getElementById("sd-site-nav")?.addEventListener("change",p=>{v.go("site-detail",{id:p.target.value})}),c){Ae(e,t),_e(t);return}document.getElementById("sd-recreate").addEventListener("click",async()=>{w("Recreating Pod","Recreating containers for this site...");try{await d.post(`/sites/${t}/recreate`),y(),l.success("Pod recreated"),v.go("site-detail",{id:t})}catch(p){y(),l.error(p.message)}}),e.querySelectorAll("[data-action]").forEach(p=>{p.addEventListener("click",async()=>{let g=p.dataset.action;if(g==="flush"){try{await d.post(`/sites/${t}/flush`),l.success("Caches flushed")}catch(m){l.error(m.message)}return}w(`${{start:"Starting",stop:"Stopping",restart:"Restarting",update:"Updating"}[g]??g} Pod`,"Please wait...");try{await d.post(`/sites/${t}/${g}`),y(),l.success(`Site ${g} successful`),v.go("site-detail",{id:t})}catch(m){y(),l.error(m.message)}})}),le(e,t),fe(e,t),me(e,t),W(e),s.SiteType===1&&we(e,t),T(e),He(e,t),xe(t),he(e,t),ie(e,t),D(e,t),u&&(pe(e,t),V(e,t)),Me(e),be(a??[])}async function z(e){let t=document.getElementById("totp-qr-img"),s=document.getElementById("totp-qr-wrap");if(!t||!s)return;if(s.querySelectorAll(".totp-uri-text").forEach(n=>n.remove()),typeof QRCode<"u")try{let n=await new Promise((i,o)=>{QRCode.toDataURL(e,{width:220,margin:2},(r,c)=>{r?o(r):i(c)})});t.src=n,t.style.display="";return}catch{}let a=document.createElement("p");a.className="totp-uri-text kp-muted uk-text-small",a.style.wordBreak="break-all",a.textContent=e,s.appendChild(a)}function J(e){document.getElementById("kp-backup-codes-modal")?.remove();let s=`
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
`),i=document.getElementById("kp-backup-copy-btn");if(navigator.clipboard)navigator.clipboard.writeText(n).then(()=>{i.textContent="Copied!"});else{let o=document.createElement("textarea");o.value=n,o.style.cssText="position:fixed;opacity:0",document.body.appendChild(o),o.select();try{document.execCommand("copy"),i.textContent="Copied!"}catch{}o.remove()}}),document.getElementById("kp-backup-done-btn").addEventListener("click",()=>{a.hide(),document.getElementById("kp-backup-codes-modal")?.remove(),v.go("users")})}function $e(e){document.body.insertAdjacentHTML("beforeend",`
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
        </div>`);let s=UIkit.modal("#kp-create-user-modal");s.show(),document.getElementById("create-user-form").addEventListener("submit",async a=>{a.preventDefault();let n=a.target.querySelector('[type="submit"]'),i=n.innerHTML;n.disabled=!0,n.innerHTML='<div uk-spinner="ratio: 0.6"></div> Creating...';let o=new FormData(a.target),r={fname:o.get("fname").trim(),lname:o.get("lname").trim(),uname:o.get("uname").trim(),email:o.get("email").trim(),phone:o.get("phone").trim(),password:o.get("password"),role:parseInt(o.get("role"))};try{let c=I(await d.post("/users",r));document.getElementById("users-table-body").insertAdjacentHTML("beforeend",Y(c)),l.success(`User '${c.uname}' created`),document.getElementById("create-user-form").style.display="none",document.getElementById("cu-totp-section").style.display="",Ne(c.id,s)}catch(c){l.error(c.message),n.disabled=!1,n.innerHTML=i}}),document.getElementById("kp-create-user-modal").addEventListener("hidden",()=>document.getElementById("kp-create-user-modal")?.remove())}function Ne(e,t){let s=()=>{t.hide(),document.getElementById("kp-create-user-modal")?.remove(),v.go("users")};document.getElementById("cu-totp-skip-btn").addEventListener("click",s),document.getElementById("cu-totp-setup-btn").addEventListener("click",async()=>{let a=document.getElementById("cu-totp-setup-btn");a.disabled=!0,a.textContent="Setting up\u2026";try{let n=await d.post(`/users/${e}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=n.secret,document.getElementById("totp-setup-area").style.display="",document.getElementById("cu-totp-skip-btn").style.display="none",await z(n.uri)}catch(n){l.error(n.message),a.disabled=!1,a.textContent="Enable TOTP"}}),document.getElementById("cu-totp-confirm-btn").addEventListener("click",async()=>{let a=document.getElementById("totp-confirm-code").value.trim();if(a.length!==6){l.error("Enter a 6-digit code");return}let n=document.getElementById("cu-totp-confirm-btn");n.disabled=!0;try{let i=await d.post(`/users/${e}/totp/confirm`,{code:a});t.hide(),document.getElementById("kp-create-user-modal")?.remove(),l.success("TOTP enabled"),i.backup_codes?.length?J(i.backup_codes):v.go("users")}catch(i){l.error(i.message),n.disabled=!1}})}async function Ee(e,t){document.getElementById("kp-edit-user-modal")?.remove();let s;try{s=I(await d.get(`/users/${t}`))}catch(u){l.error(u.message);return}let a=window.KP?.user?.role===99,n=`
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
        </div>`;document.body.insertAdjacentHTML("beforeend",n);let i=UIkit.modal("#kp-edit-user-modal");i.show(),document.getElementById("edit-user-form").addEventListener("submit",async u=>{u.preventDefault();let p=u.target.querySelector('[type="submit"]'),g=p.innerHTML;p.disabled=!0,p.innerHTML='<div uk-spinner="ratio: 0.6"></div> Saving...';let b=new FormData(u.target),m={fname:b.get("fname").trim(),lname:b.get("lname").trim(),email:b.get("email").trim(),phone:b.get("phone").trim()};if(a){m.role=parseInt(b.get("role"));let f=b.get("uname");f&&(m.uname=f.trim())}let k=b.get("password");k&&(m.password=k);try{await d.put(`/users/${t}`,m),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),l.success("User updated"),v.go("users")}catch(f){l.error(f.message),p.disabled=!1,p.innerHTML=g}});let o=document.getElementById("totp-setup-btn");o&&o.addEventListener("click",async()=>{o.disabled=!0,o.textContent="Setting up\u2026";try{let u=await d.post(`/users/${t}/totp/setup`,{});document.getElementById("totp-secret-text").textContent=u.secret,document.getElementById("totp-setup-area").style.display="",await z(u.uri)}catch(u){l.error(u.message),o.disabled=!1,o.textContent="Enable TOTP"}});let r=document.getElementById("totp-confirm-btn");r&&r.addEventListener("click",async()=>{let u=document.getElementById("totp-confirm-code").value.trim();if(u.length!==6){l.error("Enter a 6-digit code");return}r.disabled=!0;try{let p=await d.post(`/users/${t}/totp/confirm`,{code:u});i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),l.success("TOTP enabled"),p.backup_codes?.length?J(p.backup_codes):v.go("users")}catch(p){l.error(p.message),r.disabled=!1}});let c=document.getElementById("totp-disable-btn");c&&c.addEventListener("click",async()=>{c.disabled=!0;try{await d.delete(`/users/${t}/totp`),l.success("TOTP disabled"),i.hide(),document.getElementById("kp-edit-user-modal")?.remove(),v.go("users")}catch(u){l.error(u.message),c.disabled=!1}}),document.getElementById("kp-edit-user-modal").addEventListener("hidden",()=>document.getElementById("kp-edit-user-modal")?.remove())}async function Le(e){if(!B()){e.innerHTML=L("Access denied");return}let t=await d.get("/users");e.innerHTML=`
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
                    ${t.map(s=>Y(I(s))).join("")}
                </tbody>
            </table>
        </div>`,document.getElementById("users-new-btn").addEventListener("click",()=>$e(e)),Ue(e)}function Y(e){let t=e.role===99?'<span class="kp-badge kp-badge-admin">Admin</span>':'<span class="kp-badge kp-badge-manager">Manager</span>';return`<tr data-user-id="${e.id}">
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
    </tr>`}function Ue(e){e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="delete-user"]');if(!(!s||!await x("Delete User","Delete this user? This cannot be undone.")))try{await d.delete(`/users/${s.dataset.uid}`),s.closest("tr").remove(),l.success("User deleted")}catch(n){l.error(n.message)}}),e.addEventListener("click",async t=>{let s=t.target.closest('[data-action="edit-user"]');s&&Ee(e,s.dataset.uid)})}v.register("dashboard",e=>ee(e));v.register("sites",e=>Z(e));v.register("site-detail",(e,t)=>Se(e,t));v.register("users",e=>Le(e));v.register("settings",e=>ae(e));v.register("security",e=>te(e));document.addEventListener("click",e=>{let t=e.target.closest("[data-view]");if(!t)return;e.preventDefault(),v.go(t.dataset.view);let s=document.getElementById("kp-offcanvas");s&&UIkit.offcanvas(s).hide()});document.addEventListener("click",async e=>{let t=e.target.closest("[data-action]");if(!t)return;e.stopPropagation();let{action:s,id:a}=t.dataset;switch(s){case"manage":v.go("site-detail",{id:a});break;case"start":await R(a,"start","Starting Site","Starting all containers - please wait...");break;case"stop":await R(a,"stop","Stopping Site","Gracefully stopping all containers - please wait...");break;case"restart":await R(a,"restart","Restarting Site","Restarting all containers - please wait...");break;case"flush":await R(a,"flush","Flushing Caches","Clearing container caches - please wait...");break;case"edit":{let n=await d.get(`/sites/${a}`);U(n.site);break}case"delete":await Fe(a);break;case"update":await R(a,"update","Updating Images","Pulling latest container images - this may take a few minutes...");break;case"recreate":w("Recreating Pod","Recreating containers for this site - this may take a few minutes...");try{await d.post(`/sites/${a}/recreate`),y(),l.success("Pod recreated"),v.go("site-detail",{id:a})}catch(n){y(),l.error(n.message)}break}});async function R(e,t,s,a){w(s,a);try{await d.post(`/sites/${e}/${t}`),y(),l.success(s+" complete"),["start","stop","restart"].includes(t)&&v.go("sites")}catch(n){y(),l.error(n.message)}}async function Fe(e){if(!await x("Delete Site","This will stop and permanently remove the pod and all its data. Are you sure?"))return;w("Deleting Site","Stopping containers and removing the pod - please wait...");try{await d.delete(`/sites/${e}`)}catch{}let s=!1,a=0;for(;!s&&a<10;){try{await new Promise(i=>setTimeout(i,2e3)),s=!(await d.get("/sites")).find(i=>i.ID===parseInt(e))}catch{}a++}y(),s?(l.success("Site deleted"),v.go("sites")):l.error("Delete failed - site still exists after 20s")}window.addEventListener("hashchange",()=>{let{view:e,params:t}=K();v.go(e,t)});var{view:je,params:We}=K();v.go(je,We);})();
