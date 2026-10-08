'use strict';

// CONFIGURATION: paste only your Supabase browser-safe publishable/anon key here. 
const SUPABASE_URL = 'https://qdpzbyseanfqzuhtfpbd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iwrg1fvSLftjN-_45GzP6w_IP_srLh8';
// Allow both http://localhost:8000/team/ and https://happysfoundation.org/team/
// in Supabase Auth redirect settings. The current origin supports both environments.
const AUTH_REDIRECT_URL = new URL('/team/', window.location.origin).href;

(() => {
  const $ = (id) => document.getElementById(id);
  const assignmentForm = $('assignment-form'), submissionForm = $('submission-form');
  const dialog = $('assignment-dialog');
  const BUCKET = 'team-submissions';
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const FILE_TYPES = {
    pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv', txt: 'text/plain', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', zip: 'application/zip'
  };
  const labels = { not_started: 'Not Started', in_progress: 'In Progress', submitted: 'Submitted', done: 'Done' };
  const views = { dashboard: 'Dashboard', my: 'My Assignments', team: 'Team Assignments', 'turn-in': 'Turn In Work', documents: 'Documents', admin: 'Admin' };
  const denied = 'This Google account is not authorized to access the Happy’s Team Portal.';
  const migrationNotice = 'The workspace upgrade needs the manual Supabase migration before submissions and member status updates are available. Existing assignments remain available.';
  let client, member = null, members = [], tasks = [], submissions = [], editing = null;
  let generation = 0, busy = false, signingOut = false, loginMessage = '', sessionUserId = null;
  let v2 = false, documentsError = '', view = 'dashboard';
  let adminSection = 'assignments', selectedMemberId = null;
  const mobile = window.matchMedia('(max-width: 760px)');

  function message(text = '', id = 'notice') { $(id).textContent = text; $(id).hidden = !text; }
  function errorText(error) {
    if (error?.code === '42501' || /row.level|permission denied/i.test(error?.message || '')) return 'Your account does not have permission for this action. Ask an administrator to review the existing access policies.';
    if (['42703', '42P01', 'PGRST204', 'PGRST205'].includes(error?.code)) return migrationNotice;
    return error?.message || 'Unable to reach the workspace. Check your connection and try again.';
  }
  function node(tag, text = '', className = '') {
    const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; return el;
  }
  function button(text, action, className = '') {
    const el = node('button', text, className); el.type = 'button'; el.disabled = busy;
    el.addEventListener('click', action); return el;
  }
  function clearPrivateData() {
    member = null; members = []; tasks = []; submissions = []; editing = null; v2 = false; documentsError = '';
    selectedMemberId = null; adminSection = 'assignments';
    $('workspace').hidden = true; $('admin-link').hidden = true; $('view-admin').hidden = true;
    for (const id of ['stats','due-tasks','recent-tasks','my-tasks','completed-tasks','team-tasks','documents-list','review-tasks','admin-tasks','member-list','member-active-tasks','member-submitted-tasks','member-completed-tasks']) $(id).replaceChildren();
    for (const id of ['member-name','member-role','welcome','welcome-role','activity','member-detail-name','member-detail-role','member-active-count','member-submitted-count','member-completed-count']) $(id).textContent = '';
    if (dialog.open) dialog.close();
    assignmentForm.reset(); submissionForm.reset();
    assignmentForm.elements.assignee_id.replaceChildren(); submissionForm.elements.task_id.replaceChildren();
    for (const id of ['filter-assignee','filter-category']) $(id).replaceChildren();
    message(); message('', 'submission-error'); message('', 'form-error');
    closeDrawer(false);
  }
  function showLogin(text = '') {
    clearPrivateData(); $('entry').hidden = false; $('loading').hidden = true; $('login').hidden = false;
    $('retry').hidden = true; message(text, 'login-notice');
  }
  async function signOut(text = '') {
    generation++; signingOut = true; sessionUserId = null; loginMessage = text;
    showLogin(text); $('sign-in').disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' }); if (error) throw error;
      $('sign-in').disabled = false;
    } catch (error) {
      message([text, 'Sign-out could not finish. Try again.', errorText(error)].filter(Boolean).join(' '), 'login-notice');
      $('retry').hidden = false; $('retry').onclick = () => signOut(text);
    } finally { signingOut = false; }
  }
  async function authorize() {
    const { data, error } = await client.auth.getUser(); if (error) throw error;
    if (!data.user?.email) return null;
    const result = await client.from('team_members').select('id,email,name,role,active,is_admin').eq('email', data.user.email).eq('active', true).maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  }
  async function readAll(table, columns) {
    const rows = [];
    for (let start = 0; ; start += 100) {
      const { data, error } = await client.from(table).select(columns).order('id').range(start, start + 99);
      if (error) throw error;
      rows.push(...data); if (data.length < 100) return rows;
    }
  }
  async function loadWorkspace(initial = false) {
    const ticket = ++generation;
    if (initial) {
      clearPrivateData(); $('entry').hidden = false; $('login').hidden = true; $('loading').hidden = false;
    }
    $('refresh').disabled = true; $('retry').hidden = true;
    try {
      const authorized = await authorize(); if (ticket !== generation) return;
      if (!authorized) { await signOut(denied); return; }
      const probe = await client.from('tasks').select('requires_submission,submitted_at').limit(0);
      if (probe.error && !['42703','PGRST204'].includes(probe.error.code)) throw probe.error;
      const upgraded = !probe.error;
      const [people, assignments, documents] = await Promise.all([
        readAll('team_members', 'id,name,email,role,active'),
        readAll('tasks', 'id,title,description,assignee_id,created_by_id,due_date,status,priority,category,created_at,updated_at,completed_at' + (upgraded ? ',requires_submission,submitted_at' : '')),
        upgraded ? readAll('submissions', 'id,task_id,submitted_by_id,submission_type,drive_url,file_path,file_name,notes,submitted_at').then(data => ({data}), error => ({error})) : Promise.resolve({ error: {message: migrationNotice} })
      ]);
      if (ticket !== generation) return;
      member = authorized; members = people; tasks = assignments; submissions = documents.data || [];
      v2 = upgraded && !documents.error; documentsError = documents.error ? errorText(documents.error) : '';
      $('entry').hidden = true; $('workspace').hidden = false;
      $('member-name').textContent = member.name || member.email;
      $('member-role').textContent = $('welcome-role').textContent = member.role || 'Team member';
      $('welcome').textContent = 'Welcome, ' + (member.name || member.email.split('@')[0]).trim().split(/\s+/)[0];
      $('admin-link').hidden = member.is_admin !== true;
      message(v2 ? '' : (documentsError || migrationNotice));
      render(); selectView(location.hash.slice(1), false);
    } catch (error) {
      if (ticket !== generation) return;
      showLogin('Unable to load your workspace. ' + errorText(error));
      $('retry').hidden = false; $('retry').onclick = () => loadWorkspace(true);
    } finally { if (ticket === generation) $('refresh').disabled = false; }
  }
  function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
  function overdue(task) { return ['not_started','in_progress'].includes(task.status) && task.due_date && task.due_date < localDate(); }
  function dueSoon(task) { const end = new Date(); end.setDate(end.getDate()+7); return ['not_started','in_progress'].includes(task.status) && task.due_date >= localDate() && task.due_date <= localDate(end); }
  function sorted(items) { return [...items].sort((a,b) => Number(Boolean(overdue(b))) - Number(Boolean(overdue(a))) || (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31') || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)); }
  function person(id) { const p = members.find(p => p.id === id); return p?.name || p?.email || 'Unavailable team member'; }
  function formattedDate(value, withTime = false) { if (!value) return 'Date unavailable'; const d = new Date(withTime ? value : value+'T12:00:00'); return Number.isNaN(d.getTime()) ? 'Date unavailable' : d.toLocaleString(undefined, {year:'numeric',month:'short',day:'numeric',...(withTime ? {hour:'numeric',minute:'2-digit'} : {})}); }
  function taskCard(task, showAssignee = true) {
    const card = node('article','', 'task-card' + (overdue(task) ? ' overdue' : ''));
    const head = node('div','','task-card-head'); head.append(node('h4',task.title),node('span',labels[task.status] || task.status,'tag status-'+task.status)); card.append(head);
    if (showAssignee) card.append(node('p','Assigned to '+person(task.assignee_id),'assignee'));
    if (task.description) card.append(node('p',task.description,'task-description'));
    const meta = node('div','','task-meta');
    meta.append(node('span',({low:'Low',normal:'Normal',high:'High'}[task.priority] || 'Normal')+' priority','tag priority-'+task.priority));
    if (task.category) meta.append(node('span',task.category,'tag'));
    if (task.requires_submission) meta.append(node('span','Submission required','tag'));
    card.append(meta);
    const bottom = node('div','','task-bottom');
    const due = node('p',task.due_date ? (overdue(task) ? 'Overdue · ' : 'Due ')+formattedDate(task.due_date) : 'No due date');
    if (overdue(task)) due.className = 'due-overdue'; bottom.append(due);
    const actions = node('div','','actions');
    if (member.is_admin) { const edit = button('Edit',()=>openForm(task)); edit.setAttribute('aria-label','Edit assignment: '+task.title); actions.append(edit); }
    if (task.assignee_id === member.id && v2) {
      if (task.status === 'not_started') actions.append(button('Start task',()=>changeStatus(task,'in_progress')));
      if (task.status === 'in_progress' && !task.requires_submission) actions.append(button('Mark Done',()=>changeStatus(task,'done')));
      if (['not_started','in_progress'].includes(task.status)) actions.append(button('Turn In Work',()=>{selectView('turn-in'); submissionForm.elements.task_id.value=task.id;}));
    }
    if (task.status === 'submitted') actions.append(button('View submissions',()=>selectView('documents')));
    bottom.append(actions); card.append(bottom); return card;
  }
  function taskList(id, items, empty = 'No assignments right now.', showAssignee = true) {
    const list = $(id); list.replaceChildren();
    if (!items.length) list.append(node('p',empty,'empty')); else items.forEach(task=>list.append(taskCard(task,showAssignee)));
  }
  function fillSelect(select, people, placeholder, valueKey='id', label=(p)=>p.name||p.email) {
    const previous = select.value; select.replaceChildren(new Option(placeholder,''));
    people.forEach(p=>select.add(new Option(label(p),p[valueKey]))); if ([...select.options].some(o=>o.value===previous)) select.value=previous;
  }
  function render() {
    const mine = tasks.filter(t=>t.assignee_id===member.id), active = mine.filter(t=>t.status!=='done');
    $('stats').replaceChildren();
    for (const [label,count] of [['My Open Assignments',active.length],['Due Soon',mine.filter(dueSoon).length],['Overdue',mine.filter(overdue).length],['Submitted',mine.filter(t=>t.status==='submitted').length]]) {
      const stat=node('div','','stat'); stat.append(node('strong',String(count)),node('span',label)); $('stats').append(stat);
    }
    taskList('due-tasks',sorted(mine.filter(dueSoon)),'Nothing due in the next 7 days.',false);
    const recent=tasks.filter(t=>['submitted','done'].includes(t.status)).sort((a,b)=>(b.completed_at||b.submitted_at||b.updated_at||'').localeCompare(a.completed_at||a.submitted_at||a.updated_at||'')).slice(0,5);
    taskList('recent-tasks',recent,'No submitted or completed assignments yet.');
    taskList('my-tasks',sorted(active),undefined,false);
    taskList('completed-tasks',sorted(mine.filter(t=>t.status==='done')),'No completed assignments yet.',false);
    $('completed-summary').textContent=`Completed assignments (${mine.filter(t=>t.status==='done').length})`;
    fillSelect($('filter-assignee'),members,'All members');
    fillSelect($('filter-category'),[...new Set(tasks.map(t=>t.category).filter(Boolean))].sort().map(category=>({category})),'All categories','category',p=>p.category);
    renderTeam(); renderDocuments(); renderMembers();
    taskList('review-tasks',sorted(tasks.filter(t=>t.status==='submitted')),'No assignments awaiting review.');
    if (member.is_admin) taskList('admin-tasks',sorted(tasks)); else $('admin-tasks').replaceChildren();
    const eligible=sorted(mine.filter(t=>['not_started','in_progress'].includes(t.status)));
    fillSelect(submissionForm.elements.task_id,eligible,'Choose an assignment','id',t=>t.title);
    const unavailable=!v2 ? documentsError||migrationNotice : !eligible.length ? 'No assignments are ready to turn in. Submitted work stays in Documents while it awaits review.' : '';
    message(unavailable,'submission-unavailable');
    $('submission-fields').disabled=busy||!v2||!eligible.length; $('submit-work').disabled=busy||!v2||!eligible.length;
    setSubmissionMethod();
  }
  function completedNewest(items) {
    const timestamp = task => {
      const value = task.completed_at ? Date.parse(task.completed_at) : NaN;
      return Number.isNaN(value) ? -Infinity : value;
    };
    return [...items].sort((a,b) => timestamp(b) - timestamp(a)
      || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  }
  function completionLabel(task) {
    return task.completed_at && !Number.isNaN(Date.parse(task.completed_at))
      ? formattedDate(task.completed_at, true) : 'Completion date not recorded';
  }
  function showAdminSection(section, focus = false) {
    if (!member?.is_admin) return;
    adminSection = section === 'members' ? 'members' : 'assignments';
    $('admin-assignments-panel').hidden = adminSection !== 'assignments';
    $('admin-members-panel').hidden = adminSection !== 'members';
    $('admin-assignments-tab').setAttribute('aria-pressed', String(adminSection === 'assignments'));
    $('admin-members-tab').setAttribute('aria-pressed', String(adminSection === 'members'));
    if (focus && adminSection === 'members') $(selectedMemberId ? 'member-detail-name' : 'members-heading').focus();
  }
  function renderMembers() {
    const list = $('member-list'); list.replaceChildren();
    if (!member?.is_admin) {
      selectedMemberId = null;
      $('admin-members-panel').hidden = true;
      $('member-detail').hidden = true;
      for (const id of ['member-active-tasks','member-submitted-tasks','member-completed-tasks']) $(id).replaceChildren();
      $('member-detail-name').textContent = ''; $('member-detail-role').textContent = '';
      return;
    }
    // Alphabetical order is stable and independent of workload or completion counts.
    const activeMembers = members.filter(p => p.active === true).sort((a,b) =>
      (a.name || a.email).localeCompare(b.name || b.email) || a.id.localeCompare(b.id));
    const assignmentsByMember = new Map(activeMembers.map(p => [p.id, []]));
    tasks.forEach(task => assignmentsByMember.get(task.assignee_id)?.push(task));
    if (!activeMembers.length) list.append(node('p', 'No active team members are visible to your account.', 'empty'));
    activeMembers.forEach(p => {
      const assigned = assignmentsByMember.get(p.id);
      const completed = completedNewest(assigned.filter(t => t.status === 'done'));
      const row = node('article', '', 'member-card'); row.dataset.memberId = p.id;
      const heading = node('div', '', 'member-card-heading');
      const identity = node('div'); const title = node('h4');
      const open = button(p.name || p.email, () => {
        if (!member?.is_admin) return;
        selectedMemberId = p.id; renderMemberDetail(p, assignmentsByMember.get(p.id));
        $('member-detail-name').focus();
      }, 'member-name-button');
      open.setAttribute('aria-label', 'View member: ' + (p.name || p.email));
      title.append(open); identity.append(title, node('p', p.role || 'Team member', 'muted'));
      heading.append(identity); row.append(heading);
      const counts = node('dl', '', 'member-counts');
      for (const [label, count] of [
        ['Not Started', assigned.filter(t => t.status === 'not_started').length],
        ['In Progress', assigned.filter(t => t.status === 'in_progress').length],
        ['Submitted', assigned.filter(t => t.status === 'submitted').length],
        ['Completed', completed.length],
        ['Overdue', assigned.filter(overdue).length]
      ]) {
        const metric = node('div'); metric.append(node('dt', label), node('dd', String(count))); counts.append(metric);
      }
      row.append(counts, node('h5', 'Recent Completed', 'recent-completed-heading'));
      if (!completed.length) row.append(node('p', 'No completed assignments yet.', 'muted'));
      else {
        const recent = node('ul', '', 'recent-completed');
        completed.slice(0,3).forEach(task => {
          const item = node('li'); item.append(node('span', task.title), node('span', completionLabel(task), 'completion-date'));
          recent.append(item);
        });
        row.append(recent);
      }
      list.append(row);
    });
    const selected = activeMembers.find(p => p.id === selectedMemberId);
    if (!selected) selectedMemberId = null;
    renderMemberDetail(selected, selected ? assignmentsByMember.get(selected.id) : []);
    showAdminSection(adminSection);
  }
  function renderMemberDetail(p, assigned) {
    if (!member?.is_admin) return;
    $('members-overview').hidden = !!p; $('member-detail').hidden = !p;
    if (!p) {
      for (const id of ['member-active-tasks','member-submitted-tasks','member-completed-tasks']) $(id).replaceChildren();
      $('member-detail-name').textContent = ''; $('member-detail-role').textContent = '';
      return;
    }
    $('member-detail-name').textContent = p.name || p.email;
    $('member-detail-role').textContent = p.role || 'Team member';
    const active = sorted(assigned.filter(t => ['not_started','in_progress'].includes(t.status)));
    const submitted = sorted(assigned.filter(t => t.status === 'submitted'));
    const completed = completedNewest(assigned.filter(t => t.status === 'done'));
    $('member-active-count').textContent = String(active.length);
    $('member-submitted-count').textContent = String(submitted.length);
    $('member-completed-count').textContent = String(completed.length);
    taskList('member-active-tasks', active, 'No active assignments right now.', false);
    taskList('member-submitted-tasks', submitted, 'No assignments awaiting review.', false);
    const list = $('member-completed-tasks'); list.replaceChildren();
    if (!completed.length) list.append(node('p', 'No completed assignments yet.', 'empty'));
    completed.forEach(task => {
      const card = taskCard(task, false);
      const attribution = node('p', 'Completed by ' + (p.name || p.email), 'completion-attribution');
      card.querySelector('.task-card-head').after(attribution);
      card.append(node('p', completionLabel(task), 'completion-date'));
      list.append(card);
    });
  }
  function renderTeam() {
    const items=sorted(tasks.filter(t=>t.status!=='done' && (!$('filter-assignee').value||t.assignee_id===$('filter-assignee').value) && (!$('filter-status').value||t.status===$('filter-status').value) && (!$('filter-priority').value||t.priority===$('filter-priority').value) && (!$('filter-category').value||t.category===$('filter-category').value)));
    $('filter-count').textContent=`${items.length} assignment${items.length===1?'':'s'}`; taskList('team-tasks',items,'No assignments match these filters.');
  }
  function safeDriveUrl(value) {
    try { const url=new URL(value.trim()); return url.protocol==='https:' && ['drive.google.com','docs.google.com'].includes(url.hostname) && !url.username && !url.password && !url.port ? url.href : null; } catch { return null; }
  }
  function renderDocuments() {
    const list=$('documents-list'); list.replaceChildren();
    if (documentsError) { list.append(node('p',documentsError,'notice')); return; }
    if (!submissions.length) { list.append(node('p','No submissions yet. Turn in work to share it with the team.','empty')); return; }
    const latest=new Map();
    const ordered=[...submissions].sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at));
    ordered.forEach(s=>{if(!latest.has(s.task_id))latest.set(s.task_id,s.id);});
    ordered.forEach(s=>{
      const task=tasks.find(t=>t.id===s.task_id); const card=node('article','','task-card');
      const head=node('div','','task-card-head'); head.append(node('h4',task?.title||'Assignment unavailable'),node('span',labels[task?.status]||'Unavailable','tag status-'+task?.status)); card.append(head);
      card.append(node('p',`${person(s.submitted_by_id)} · ${formattedDate(s.submitted_at,true)} · ${s.submission_type==='file'?'File':'Google Drive'}`,'assignee'));
      if(s.submission_type==='drive_link') {
        const url=safeDriveUrl(s.drive_url||'');
        if(url){const link=node('a','Open Google Drive document','document-link');link.href=url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
        else card.append(node('p','This submission has an invalid document link.','muted'));
      } else card.append(button('Download '+(s.file_name||'file'),event=>downloadFile(s,event.currentTarget)));
      if(s.notes)card.append(node('p',s.notes,'document-notes'));
      if(member.is_admin&&task?.status==='submitted'&&latest.get(task.id)===s.id){const actions=node('div','','actions');actions.append(button('Mark Done',()=>changeStatus(task,'done')),button('Return for Changes',()=>changeStatus(task,'in_progress')));card.append(actions);}
      list.append(card);
    });
  }
  async function downloadFile(submission, control) {
    const ticket=generation; control.disabled=true;
    try {
      const {data,error}=await client.storage.from(BUCKET).createSignedUrl(submission.file_path,60,{download:submission.file_name||true});
      if(ticket!==generation)return; if(error)throw error;
      const url=new URL(data.signedUrl); if(url.origin!==new URL(SUPABASE_URL).origin||!url.pathname.startsWith('/storage/v1/'))throw new Error('Unable to create a trusted download link.');
      const link=node('a','Download file (link valid for 60 seconds)','document-link');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';control.replaceWith(link);
      setTimeout(()=>{if(link.isConnected)link.replaceWith(button('Download '+(submission.file_name||'file'),e=>downloadFile(submission,e.currentTarget)));},60000);
    } catch(error){if(ticket===generation)message(errorText(error));}finally{control.disabled=false;}
  }
  function selectView(requested='dashboard', focus=true) {
    if(!member)return; view=Object.hasOwn(views,requested)?requested:'dashboard';
    if(view==='admin'&&!member.is_admin)view='dashboard';
    for(const key of Object.keys(views))$('view-'+key).hidden=key!==view;
    document.querySelectorAll('[data-view]').forEach(a=>{if(a.dataset.view===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('page-title').textContent=views[view]; history.replaceState(null,'','#'+view); closeDrawer(false);
    if(focus)$('page-title').focus();
  }
  function openDrawer() {
    document.body.classList.add('drawer-open');$('drawer-backdrop').hidden=false;$('menu-open').setAttribute('aria-expanded','true');$('main').inert=true;document.querySelector('.mobile-header').inert=true;
    $('sidebar').setAttribute('role','dialog');$('sidebar').setAttribute('aria-modal','true');$('menu-close').focus();
  }
  function closeDrawer(focus=true) {
    document.body.classList.remove('drawer-open');$('drawer-backdrop').hidden=true;$('menu-open').setAttribute('aria-expanded','false');$('main').inert=false;document.querySelector('.mobile-header').inert=false;
    $('sidebar').removeAttribute('role');$('sidebar').removeAttribute('aria-modal');if(focus)$('menu-open').focus();
  }
  function setBusy(value) {
    busy=value;$('refresh').disabled=value;$('sign-out').disabled=value;
    $('form-fields').disabled=value;for(const id of ['save','delete','close-dialog'])$(id).disabled=value;
    $('save').textContent=value?'Saving…':'Save assignment';$('submit-work').textContent=value?'Submitting…':'Submit Work';
    const canSubmit=v2&&member&&tasks.some(t=>t.assignee_id===member.id&&['not_started','in_progress'].includes(t.status));
    $('submission-fields').disabled=value||!canSubmit;$('submit-work').disabled=value||!canSubmit;
    document.querySelectorAll('.task-list button,#add').forEach(b=>b.disabled=value);
  }
  async function perform(action, errorId='notice', success='Assignment updated.') {
    if(busy||!member)return; const ticket=generation; setBusy(true);message('',errorId);
    try {
      const authorized=await authorize();if(ticket!==generation)return;
      if(!authorized){await signOut(denied);return;}member=authorized;
      await action(ticket);if(ticket!==generation)return;
      if(dialog.open)dialog.close();await loadWorkspace();if(member)$('activity').textContent=success;
    }catch(error){if(ticket===generation)message(errorText(error),errorId);}finally{setBusy(false);}
  }
  async function changed(query) {const {data,error}=await query.select('id');if(error)throw error;if(data?.length!==1)throw new Error('No assignment changed. It may have been updated, removed, or become unavailable. Refresh and try again.');}
  async function changeStatus(task,status) {
    if(!v2)return;
    await perform(async()=>{
      if(!member.is_admin && (task.assignee_id!==member.id || !(task.status==='not_started'&&status==='in_progress' || task.status==='in_progress'&&status==='done'&&!task.requires_submission)))throw new Error('This status change is not allowed.');
      await changed(client.from('tasks').update({status}).eq('id',task.id).eq('status',task.status));
    },'notice',status==='in_progress'&&task.status==='submitted'?'Work returned for changes. Previous submissions are preserved.':'Assignment updated.');
  }
  function openForm(task=null) {
    if(!member?.is_admin||busy)return;editing=task;assignmentForm.reset();message('','form-error');
    $('form-heading').textContent=task?'Edit Assignment':'Add Assignment';$('delete').hidden=!task;
    fillSelect(assignmentForm.elements.assignee_id,members.filter(p=>p.active),'Choose a team member');
    assignmentForm.elements.requires_submission.disabled=!v2;
    assignmentForm.elements.status.querySelector('[value="submitted"]').disabled=!v2;
    if(task){for(const key of ['title','description','assignee_id','due_date','status','priority','category'])assignmentForm.elements[key].value=task[key]||'';assignmentForm.elements.requires_submission.checked=!!task.requires_submission;}
    if(!assignmentForm.elements.assignee_id.value&&task)message('Choose an active assignee before saving.','form-error');
    dialog.showModal();assignmentForm.elements.title.focus();
  }
  async function saveAssignment(remove=false) {
    if(!member?.is_admin||busy)return;if(!remove&&!assignmentForm.reportValidity())return;
    const original=editing;const values=Object.fromEntries(new FormData(assignmentForm));
    if(remove&&!window.confirm('Delete this assignment? Assignments with submissions cannot be deleted; mark them Done to preserve their history.'))return;
    if(!remove&&!values.title.trim()){message('Enter an assignment title.','form-error');return;}
    await perform(async()=>{
      if(!member.is_admin)throw new Error('Administrator access is required.');
      if(remove){await changed(client.from('tasks').delete().eq('id',original.id));return;}
      const payload={title:values.title.trim(),description:values.description.trim()||null,assignee_id:values.assignee_id,due_date:values.due_date||null,status:values.status,priority:values.priority,category:values.category.trim()||null};
      if(v2)payload.requires_submission=values.requires_submission==='on';
      else {payload.completed_at=values.status==='done'?(original?.completed_at||new Date().toISOString()):null;if(original)payload.updated_at=new Date().toISOString();}
      if(original)await changed(client.from('tasks').update(payload).eq('id',original.id));
      else{payload.created_by_id=member.id;await changed(client.from('tasks').insert(payload));}
    },'form-error',remove?'Assignment deleted.':'Assignment saved.');
  }
  function setSubmissionMethod() {
    const isFile=submissionForm.elements.submission_type.value==='file';$('drive-fields').hidden=isFile;$('file-fields').hidden=!isFile;
    submissionForm.elements.drive_url.required=!isFile;submissionForm.elements.file.required=isFile;
    submissionForm.elements.drive_url.disabled=isFile;submissionForm.elements.file.disabled=!isFile;
  }
  const pendingKey=()=> 'happys-team-pending-'+member.id;
  async function reconcilePending() {
    const raw=sessionStorage.getItem(pendingKey());if(!raw)return false;
    const pending=JSON.parse(raw);
    const {data,error}=await client.from('submissions').select('id').eq('id',pending.id).maybeSingle();
    if(error)throw new Error('The previous submission result is still unknown. Check your connection and try again; no duplicate submission was sent.');
    if(!data&&pending.path){const cleanup=await client.storage.from(BUCKET).remove([pending.path]);if(cleanup.error)throw new Error('The previous upload needs cleanup before retrying. '+errorText(cleanup.error));}
    sessionStorage.removeItem(pendingKey());return !!data;
  }
  async function submitWork() {
    if(!v2||busy||!submissionForm.reportValidity())return;
    const values=Object.fromEntries(new FormData(submissionForm));const task=tasks.find(t=>t.id===values.task_id);
    if(!task||task.assignee_id!==member.id||!['not_started','in_progress'].includes(task.status)){message('Choose one of your active assignments.','submission-error');return;}
    const file=submissionForm.elements.file.files[0];const isFile=values.submission_type==='file';const driveUrl=isFile?null:safeDriveUrl(values.drive_url||'');
    if(!isFile&&!driveUrl){message('Enter an HTTPS link from drive.google.com or docs.google.com.','submission-error');return;}
    const extension=file?.name.split('.').pop().toLowerCase();
    if(isFile&&(!file||!FILE_TYPES[extension]||file.size===0||file.size>MAX_FILE_SIZE)){message('Choose a supported, nonempty file up to 20 MB.','submission-error');return;}
    await perform(async(ticket)=>{
      if(await reconcilePending()){submissionForm.reset();return;}
      if(ticket!==generation)return;
      if(task.assignee_id!==member.id)throw new Error('You can only submit work for your own assignment.');
      const id=crypto.randomUUID();const path=isFile?`${member.id}/${task.id}/${id}.${extension}`:null;
      sessionStorage.setItem(pendingKey(),JSON.stringify({id,path}));
      if(isFile){const upload=await client.storage.from(BUCKET).upload(path,file,{contentType:FILE_TYPES[extension],upsert:false});if(upload.error)throw upload.error;}
      if(ticket!==generation)return;
      const payload={id,task_id:task.id,submitted_by_id:member.id,submission_type:values.submission_type,drive_url:driveUrl,file_path:path,file_name:isFile?file.name:null,notes:values.notes.trim()||null};
      // The database trigger moves the task to Submitted in this same transaction.
      const {data,error}=await client.from('submissions').insert(payload).select('id');
      if(error)throw error;if(data?.length!==1)throw new Error('Submission was not confirmed. Refresh Documents before trying again.');
      sessionStorage.removeItem(pendingKey());submissionForm.reset();
    },'submission-error','Work submitted for review.');
  }
  $('navigation').addEventListener('click',event=>{const link=event.target.closest('[data-view]');if(link){event.preventDefault();selectView(link.dataset.view);}});
  window.addEventListener('hashchange',()=>selectView(location.hash.slice(1),false));
  $('menu-open').addEventListener('click',openDrawer);$('menu-close').addEventListener('click',()=>closeDrawer());$('drawer-backdrop').addEventListener('click',()=>closeDrawer());
  mobile.addEventListener('change',()=>closeDrawer(false));
  document.addEventListener('keydown',event=>{
    if(!document.body.classList.contains('drawer-open'))return;
    if(event.key==='Escape'){event.preventDefault();closeDrawer();}
    if(event.key==='Tab'){const els=[...$('sidebar').querySelectorAll('a,button')].filter(el=>!el.hidden&&el.getClientRects().length);const first=els[0],last=els.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  $('filters').addEventListener('submit',e=>e.preventDefault());$('filters').addEventListener('change',renderTeam);$('clear-filters').addEventListener('click',()=>{$('filters').reset();renderTeam();});
  $('admin-assignments-tab').addEventListener('click', () => showAdminSection('assignments'));
  $('admin-members-tab').addEventListener('click', () => showAdminSection('members', true));
  $('back-to-members').addEventListener('click', () => {
    if (!member?.is_admin) return;
    selectedMemberId = null; renderMembers(); $('members-heading').focus();
  });
  $('review-documents').addEventListener('click',()=>selectView('documents'));
  $('close-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  assignmentForm.addEventListener('submit',e=>{e.preventDefault();void saveAssignment();});$('delete').addEventListener('click',()=>void saveAssignment(true));$('add').addEventListener('click',()=>openForm());
  submissionForm.addEventListener('submit',e=>{e.preventDefault();void submitWork();});submissionForm.addEventListener('change',setSubmissionMethod);
  $('refresh').addEventListener('click',()=>{if(!busy)void loadWorkspace();});$('sign-out').addEventListener('click',()=>void signOut());
  $('sign-in').addEventListener('click',async()=>{
    $('sign-in').disabled=true;loginMessage='';message('','login-notice');
    try{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:AUTH_REDIRECT_URL,queryParams:{prompt:'select_account'}}});if(error)throw error;}
    catch(error){message('Unable to sign in. '+errorText(error),'login-notice');$('sign-in').disabled=false;}
  });
  if(SUPABASE_ANON_KEY==='PASTE_SUPABASE_PUBLISHABLE_KEY_HERE'||!SUPABASE_ANON_KEY.trim()){showLogin('Portal setup is not finished. Add the Supabase publishable/anon key to SUPABASE_ANON_KEY near the top of team/team.js.');$('sign-in').disabled=true;return;}
  if(!window.supabase?.createClient){showLogin('The sign-in library could not load. Check your connection and reload this page.');$('sign-in').disabled=true;return;}
  try{
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'happys-team-auth'}});
    const callback=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.slice(1));
    if(callback.has('error')||hash.has('error')){loginMessage='Google sign-in was canceled or could not be completed. Please try again.';history.replaceState(null,'','/team/');}
    // Never await Supabase calls while the auth callback holds its internal lock.
    client.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){generation++;sessionUserId=null;showLogin(loginMessage);return;}
      if(signingOut)return;
      if(['INITIAL_SESSION','SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event)){
        if(!session){generation++;sessionUserId=null;showLogin(loginMessage);return;}
        // Refocusing the tab can emit SIGNED_IN. Preserve forms for the same user.
        if(sessionUserId===session.user.id&&member&&['SIGNED_IN','TOKEN_REFRESHED'].includes(event))return;
        const switched=sessionUserId!==session.user.id;sessionUserId=session.user.id;
        const ticket=++generation;if(switched)clearPrivateData();
        setTimeout(()=>{if(ticket===generation)void loadWorkspace(true);},0);
      }
    });
  }catch(error){showLogin('Unable to initialize sign-in. '+errorText(error));$('sign-in').disabled=true;}
})();
