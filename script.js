const loader=document.querySelector('.page-loader');
const prefersReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let hasSeenLoader=false;
try{hasSeenLoader=sessionStorage.getItem('happys-entry-seen')==='yes';sessionStorage.setItem('happys-entry-seen','yes')}catch(error){hasSeenLoader=false}
if(loader){if(hasSeenLoader||prefersReducedMotion){loader.remove()}else{const minimum=520;const started=performance.now();const release=()=>setTimeout(()=>{loader.classList.add('is-leaving');setTimeout(()=>loader.remove(),420)},Math.max(0,minimum-(performance.now()-started)));if(document.readyState==='complete')release();else window.addEventListener('load',release,{once:true});setTimeout(release,1100)}}

// Keep editorial punctuation conversational without changing substantive copy.
const copyWalker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
const copyNodes=[];while(copyWalker.nextNode())copyNodes.push(copyWalker.currentNode);
copyNodes.forEach(node=>{if(node.nodeValue.includes('—'))node.nodeValue=node.nodeValue.replace(/\s*—\s*/g,', ')});

// One shared public navigation across the static pages.
const currentPage=location.pathname.split('/').pop()||'index.html';
if(currentPage==='services.html'&&location.hash==='#available')window.addEventListener('load',()=>requestAnimationFrame(()=>document.getElementById('hire')?.scrollIntoView()),{once:true});
const primaryLinks=[['services.html','Get Involved'],['how-it-works.html','How It Works'],['mission.html','Our Mission'],['animal-welfare.html','Animal Welfare']];
const utilityLinks=[['contact.html','Contact Us'],['about.html','About Us']];
const actionLinks=[['partner.html','Partner With Us'],['services.html#request','Hire the Team'],['donate.html','Donate']];
document.querySelectorAll('.header-inner').forEach(header=>{header.innerHTML=`<div class="header-top"><a class="brand" href="index.html"><span class="brand-mark">H</span><span>Happy's <em>Foundation</em></span></a><div class="header-utility"><nav aria-label="Utility navigation">${utilityLinks.map(([href,label])=>`<a href="${href}">${label}</a>`).join('')}</nav><div class="header-cta-group">${actionLinks.map(([href,label])=>`<a class="header-cta${label==='Donate'?' header-donate':''}" href="${href}">${label}</a>`).join('')}</div></div><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle><span class="sr-only">Open navigation</span><span></span><span></span></button></div><nav class="desktop-nav" aria-label="Primary navigation">${primaryLinks.map(([href,label])=>`<a href="${href}"${currentPage===href?' class="active"':''}>${label}</a>`).join('')}</nav>`});
const mobileLinks=[...primaryLinks,...utilityLinks,...actionLinks];
document.querySelectorAll('.mobile-nav-inner').forEach(nav=>{nav.innerHTML=mobileLinks.map(([href,label])=>`<a href="${href}">${label}</a>`).join('')});
document.querySelectorAll('.header-donate').forEach(link=>{link.href='donate.html';link.classList.toggle('active',currentPage==='donate.html')});
document.querySelectorAll('.brand em').forEach(label=>{label.textContent='Foundation'});
const footerMarkup='<div><h3>Get involved</h3><a href="services.html">Ways to take part</a><a href="customers.html">Hire our services</a><a href="apply.html">Join the team</a></div><div><h3>Connect</h3><a href="partner.html">Partner with us</a><a href="contact.html">Contact us</a><a href="donate.html">Donate</a></div><div><h3>Learn</h3><a href="mission.html">Our mission</a><a href="animal-welfare.html">Animal welfare</a><a href="about.html">About us</a></div>';
document.querySelectorAll('.footer-links').forEach(footer=>{footer.innerHTML=footerMarkup});
document.querySelectorAll('.footer-intro>p').forEach(tagline=>{tagline.innerHTML='They can’t ask.<br>We don’t wait.'});
const socialMarkup='<a href="#social-placeholder" aria-label="Instagram placeholder"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle class="social-dot" cx="17.4" cy="6.7" r="1"></circle></svg></a><a href="#social-placeholder" aria-label="TikTok placeholder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4v10.1a4.5 4.5 0 1 1-3.2-4.3"></path><path d="M14.5 4c.6 2.5 2.1 3.9 4.4 4.2"></path></svg></a><a href="#social-placeholder" aria-label="Facebook placeholder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 20v-7h2.5l.4-3h-2.9V8.1c0-.9.3-1.5 1.5-1.5h1.6V4a21 21 0 0 0-2.3-.1c-2.3 0-3.9 1.4-3.9 4V10H8.1v3h2.6v7"></path></svg></a>';
document.querySelectorAll('.footer-bottom').forEach(bottom=>{let socials=bottom.querySelector('.social-links');if(!socials){socials=document.createElement('div');socials.className='social-links';bottom.append(socials)}socials.innerHTML=socialMarkup});
document.querySelectorAll('.visual-label').forEach(label=>{label.textContent='Photo coming soon'});

const menuButton=document.querySelector('[data-menu-toggle]');
const mobileMenu=document.querySelector('[data-mobile-menu]');
function setMenu(open){if(!menuButton||!mobileMenu)return;menuButton.setAttribute('aria-expanded',String(open));mobileMenu.hidden=!open;document.body.classList.toggle('menu-open',open);const label=menuButton.querySelector('.sr-only');if(label)label.textContent=open?'Close navigation':'Open navigation'}
menuButton?.addEventListener('click',()=>setMenu(menuButton.getAttribute('aria-expanded')!=='true'));
mobileMenu?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
window.addEventListener('resize',()=>{if(innerWidth>900)setMenu(false)});
document.addEventListener('keydown',event=>{if(event.key==='Escape')setMenu(false)});
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
const form=document.querySelector('[data-newsletter-form]');
const status=document.querySelector('[data-form-status]');
form?.addEventListener('submit',event=>{event.preventDefault();const email=form.elements.email;if(!email.checkValidity()){status.textContent='Please enter a valid email address. This preview form is not connected.';status.style.color='#7c5940';email.focus();return}status.textContent='Thanks. This is a preview only, so your email was not submitted.';status.style.color='#596052';form.reset()});
// Frontend-only preview forms. Connect to an approved form handler before launch.
document.querySelectorAll('[data-preview-form]').forEach(previewForm=>previewForm.addEventListener('submit',event=>{event.preventDefault();const previewStatus=previewForm.querySelector('[data-preview-status]');if(!previewForm.checkValidity()){previewForm.reportValidity();if(previewStatus)previewStatus.textContent='Please complete the required fields. This form is still only a preview.';return}const formName=previewForm.dataset.formName||'form';previewForm.classList.add('was-submitted');if(previewStatus)previewStatus.textContent=`Your ${formName} looks complete. This is a preview, so no information was submitted.`}));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals=document.querySelectorAll('.reveal');
if(reduced||!('IntersectionObserver'in window)){reveals.forEach(el=>el.classList.add('is-visible'))}else{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12});reveals.forEach(el=>observer.observe(el))}
