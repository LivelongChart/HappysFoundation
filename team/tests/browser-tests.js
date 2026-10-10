// Browser-native regression harness; no test framework or production build needed.
(() => {
  const frame=document.getElementById('fixture'),results=document.getElementById('results');
  const wait=async(fn,label)=>{for(let n=0;n<160;n++){if(fn())return;await new Promise(r=>setTimeout(r,50));}throw new Error('Timed out: '+label);};
  const assert=(value,label)=>{if(!value)throw new Error(label);};
  const pass=label=>{const li=document.createElement('li');li.textContent='PASS '+label;results.append(li);};
  let d,w;
  async function load(mode){frame.src='fixture.html?mode='+mode;await new Promise(resolve=>frame.onload=resolve);await wait(()=>frame.contentWindow.portalMock&&frame.contentDocument.getElementById('workspace'),'fixture ready');w=frame.contentWindow;d=frame.contentDocument;await wait(()=>mode==='login'||mode==='denied'?!d.getElementById('login').hidden:!d.getElementById('workspace').hidden,'workspace ready');}
  const nav=view=>d.querySelector(`[data-view="${view}"]`).click();
  const field=(form,name,value)=>{form.elements[name].value=value;form.elements[name].dispatchEvent(new w.Event('change',{bubbles:true}));};
  const button=(container,text)=>[...container.querySelectorAll('button')].find(b=>b.textContent===text);
  const card=title=>[...d.querySelectorAll('.view:not([hidden]) article')].find(a=>a.querySelector('h4')?.textContent===title);
  async function idle(){await wait(()=>!d.getElementById('refresh').disabled,'operation finished');}
  document.getElementById('run').onclick=async()=>{
    document.getElementById('run').disabled=true;results.replaceChildren();
    const testWidth=Number(document.getElementById('test-width').value);frame.style.width=testWidth+'px';
    try{
      await load('login');d.getElementById('sign-in').click();await wait(()=>w.portalMock.oauth,'oauth call');assert(w.portalMock.oauth.provider==='google','Google provider');assert(w.portalMock.oauth.options.redirectTo===location.origin+'/team/','local redirect');assert(w.portalMock.authOptions.auth.flowType==='pkce','PKCE preserved');pass('Google login options and /team/ redirect preserved');
      await load('denied');assert(d.getElementById('login-notice').textContent.includes('not authorized'),'unauthorized notice');assert(d.getElementById('workspace').hidden,'unauthorized private state');pass('Unapproved account is signed out');
      await load('member');assert(d.getElementById('admin-link').hidden,'member admin hidden');assert(d.querySelectorAll('#stats .stat').length===4,'dashboard metrics');assert(d.querySelector('#stats strong').textContent==='3','active count');assert(d.querySelectorAll('#due-tasks article').length===3,'attention includes overdue, excludes submitted');pass('Member dashboard counts and Needs attention');
      nav('admin');assert(!d.getElementById('view-dashboard').hidden,'admin route denied');d.getElementById('admin-members-tab').click();assert(d.getElementById('member-list').children.length===0&&d.getElementById('admin-members-panel').hidden,'member directory restricted to admins');
      nav('my');assert(!d.querySelector('#my-tasks button[aria-label^="Edit"]'),'member edit absent');button(card('Community outreach'),'Start task').click();await idle();assert(w.portalMock.tasks.find(t=>t.title==='Community outreach').status==='in_progress','start own');button(card('Community outreach'),'Mark Completed').click();await idle();assert(w.portalMock.tasks.find(t=>t.title==='Community outreach').status==='done','simple done');assert(!button(card('Resource directory'),'Mark Completed'),'requires review');pass('Own-task actions and member admin restrictions');
      nav('team');assert(!button(card('Supply pickup'),'Start task'),'other member readonly');field(d.getElementById('filters'),'filter-priority','high');assert(d.querySelectorAll('#team-tasks article').length===1,'priority filter');d.getElementById('clear-filters').click();field(d.getElementById('filters'),'filter-category','Research');assert(d.querySelectorAll('#team-tasks article').length===1,'category filter');d.getElementById('clear-filters').click();field(d.getElementById('filters'),'filter-assignee',w.portalMock.id(2));assert(d.querySelectorAll('#team-tasks article').length===1,'assignee filter');d.getElementById('clear-filters').click();field(d.getElementById('filters'),'filter-status','submitted');assert(d.querySelectorAll('#team-tasks article').length===1,'status filter');pass('Team assignments are read-only for others; all four filters work');
      nav('turn-in');let form=d.getElementById('submission-form');field(form,'task_id',w.portalMock.id(12));field(form,'drive_url','https://docs.google.com.attacker.test/document');d.getElementById('submit-work').click();assert(d.getElementById('submission-error').textContent.includes('HTTPS'),'unsafe drive host rejected');
      field(form,'drive_url','https://docs.google.com/document/d/local-test');field(form,'notes','<img src=x onerror=alert(1)>');w.portalMock.auth('SIGNED_IN',{user:{id:w.portalMock.id(1)}});assert(form.elements.notes.value.includes('<img'),'same-user auth preserves draft');d.getElementById('submit-work').click();d.getElementById('submit-work').click();await idle();assert(w.portalMock.submissions.length===2,'double submit creates only one record');assert(w.portalMock.tasks.find(t=>t.id===w.portalMock.id(12)).status==='submitted','submitted status');nav('documents');assert(d.querySelectorAll('#documents-list article').length===2,'documents updated');assert(!d.querySelector('#documents-list img'),'notes safely rendered');pass('Drive submission, Submitted status, Documents and safe text');
      nav('turn-in');form=d.getElementById('submission-form');field(form,'task_id',w.portalMock.id(16));form.querySelector('[value="file"]').click();const transfer=new w.DataTransfer();transfer.items.add(new w.File(['offline test'],'final.pdf',{type:'application/pdf'}));form.elements.file.files=transfer.files;
      w.portalMock.failInsert=true;d.getElementById('submit-work').click();await idle();assert(d.getElementById('submission-error').textContent.includes('permission'),'RLS error shown');assert(w.portalMock.tasks.find(t=>t.id===w.portalMock.id(16)).status==='in_progress','no optimistic submitted');d.getElementById('submit-work').click();await idle();assert(w.portalMock.removed.length===1,'failed upload cleaned on retry');assert(w.portalMock.uploads.every(u=>u.bucket==='team-submissions'&&!u.options.upsert),'private bucket no replacement');assert(w.portalMock.tasks.find(t=>t.id===w.portalMock.id(16)).status==='submitted','file submitted');nav('documents');button(d.getElementById('documents-list'),'Download final.pdf').click();await wait(()=>w.portalMock.signed,'signed URL');assert(w.portalMock.signed.seconds===60,'short expiry');pass('File upload, failed-write recovery and expiring private download');
      await load('admin');nav('admin');assert(!d.getElementById('admin-link').hidden,'admin link');d.getElementById('add').click();form=d.getElementById('assignment-form');assert(form.elements.assignee_id.options.length===3,'active assignees only');field(form,'title','New test assignment');field(form,'assignee_id',w.portalMock.id(1));form.elements.requires_submission.checked=true;d.getElementById('save').click();await idle();let created=w.portalMock.tasks.find(t=>t.title==='New test assignment');assert(created.requires_submission&&created.created_by_id===w.portalMock.id(1),'create payload');button(card('New test assignment'),'Edit').click();field(form,'assignee_id',w.portalMock.id(2));field(form,'due_date','2030-01-01');field(form,'priority','high');d.getElementById('save').click();await idle();assert(created.assignee_id===w.portalMock.id(2)&&created.priority==='high','reassign edit');button(card('New test assignment'),'Edit').click();d.getElementById('delete').click();await idle();assert(!w.portalMock.tasks.some(t=>t.id===created.id),'delete');pass('Admin creates, edits, reassigns and deletes assignments');
      nav('documents');button(d.getElementById('documents-list'),'Return for Changes').click();await idle();assert(w.portalMock.submissions.length===1,'history preserved');assert(w.portalMock.tasks.find(t=>t.id===w.portalMock.id(14)).status==='in_progress','returned');
      nav('turn-in');form=d.getElementById('submission-form');field(form,'task_id',w.portalMock.id(14));field(form,'drive_url','https://drive.google.com/file/d/revision');d.getElementById('submit-work').click();await idle();nav('documents');assert(w.portalMock.submissions.length===2,'new revision');assert([...d.querySelectorAll('#documents-list button')].filter(b=>b.textContent==='Mark Completed').length===1,'latest version only review');button(d.getElementById('documents-list'),'Mark Completed').click();await idle();assert(w.portalMock.tasks.find(t=>t.id===w.portalMock.id(14)).status==='done','review done');pass('Admin review, revision history and completion');
      // Team Members uses existing fields only; synthetic dates make ordering deterministic.
      w.portalMock.people.push({id:w.portalMock.id(4),name:'Alex Example',email:'alex@example.test',role:'Volunteer',active:true});
      w.portalMock.tasks.find(t=>t.title==='Completed inventory').completed_at='2020-01-01T12:00:00Z';
      for(const [n,title,date] of [[31,'Latest completed','2024-03-01T10:00:00Z'],[32,'Earlier completed','2023-02-01T10:00:00Z'],[33,'Third completed','2022-01-01T10:00:00Z'],[34,'Undated completed',null]])w.portalMock.tasks.push({id:w.portalMock.id(n),title,assignee_id:w.portalMock.id(2),created_by_id:w.portalMock.id(1),status:'done',completed_at:date,priority:'normal'});
      d.getElementById('refresh').click();await idle();nav('admin');d.getElementById('admin-members-tab').click();
      let memberRows=[...d.querySelectorAll('#member-list .member-card')];assert(memberRows.length===3,'only active members');assert(memberRows.map(r=>r.querySelector('button').textContent).join(',')==='Alex Example,Jordan Example,Taylor Example','alphabetical members');
      const jordan=memberRows.find(r=>r.dataset.memberId===w.portalMock.id(2));assert(jordan.textContent.includes('Operations'),'member role');assert([...jordan.querySelectorAll('dd')].map(el=>el.textContent).join(',')==='1,0,0,5,0','member task counts');assert([...jordan.querySelectorAll('.recent-completed li > span:first-child')].map(el=>el.textContent).join(',')==='Latest completed,Earlier completed,Third completed','recent completed newest first, limited to 3');
      jordan.querySelector('button').click();assert(!d.getElementById('member-detail').hidden,'member detail open');assert(d.querySelectorAll('#member-active-tasks article').length===1,'member active tasks');assert(d.querySelectorAll('#member-submitted-tasks article').length===0,'member submitted empty');assert(d.querySelectorAll('#member-completed-tasks article').length===5,'all completed history');assert(d.querySelector('#member-completed-tasks h4').textContent==='Latest completed','detail newest first');assert(d.getElementById('member-completed-tasks').lastElementChild.textContent.includes('Completion date not recorded'),'missing date last');assert([...d.querySelectorAll('#member-completed-tasks .completion-attribution')].every(el=>el.textContent==='Completed by Jordan Example'),'completed attribution uses assignee, not creator');
      d.getElementById('refresh').click();await idle();assert(d.getElementById('member-detail-name').textContent==='Jordan Example','detail selection preserved on refresh');d.getElementById('back-to-members').click();d.querySelector('#member-list .member-card button').click();assert(d.querySelectorAll('#member-detail .empty').length===3,'zero-assignment member detail');d.getElementById('back-to-members').click();
      pass('Team Members: active-only alphabetical directory, role/counts, latest completions, assignee attribution, detail groups and empty history');
      assert(w.innerWidth===testWidth,'fixture uses selected viewport width');if(w.matchMedia('(max-width:760px)').matches){d.getElementById('menu-open').click();assert(d.body.classList.contains('drawer-open')&&d.getElementById('main').inert,'mobile drawer');d.getElementById('menu-close').click();assert(!d.getElementById('main').inert,'drawer closes');}assert(d.documentElement.scrollWidth<=w.innerWidth,'no horizontal overflow');pass('Responsive layout at '+testWidth+'px'+(testWidth<760?' with mobile drawer':''));
      // Lost-response retries recover the original task without consuming a different draft.
      for(const different of [false,true]){
        await load('member');nav('turn-in');form=d.getElementById('submission-form');
        field(form,'task_id',w.portalMock.id(12));field(form,'drive_url','https://docs.google.com/document/d/recovery');
        w.portalMock.loseInsertResponse=true;d.getElementById('submit-work').click();await idle();
        assert(w.portalMock.submissions.length===2,'lost response committed once');
        const pending=JSON.parse(w.sessionStorage.getItem('happys-team-pending-'+w.portalMock.me.id));
        assert(pending.taskId===w.portalMock.id(12),'pending task identity retained');
        if(different){field(form,'task_id',w.portalMock.id(16));field(form,'notes','Keep my current draft');field(form,'drive_url','https://drive.google.com/file/d/current');form.querySelector('[value="file"]').click();const draftFile=new w.DataTransfer();draftFile.items.add(new w.File(['keep this file'],'draft.pdf',{type:'application/pdf'}));form.elements.file.files=draftFile.files;}
        d.getElementById('submit-work').click();await idle();
        assert(w.portalMock.submissions.length===2,'recovery never duplicates');
        assert(d.getElementById('activity').textContent.includes('Previous submission recovered for “Resource directory”'),'recovered task named');
        assert(!w.sessionStorage.getItem('happys-team-pending-'+w.portalMock.me.id),'pending cleared');
        if(different){
          assert(form.elements.task_id.value===w.portalMock.id(16)&&form.elements.notes.value==='Keep my current draft'&&form.elements.drive_url.value==='https://drive.google.com/file/d/current','different draft preserved');assert(form.elements.file.files[0]?.name==='draft.pdf'&&form.elements.submission_type.value==='file','file selection and method preserved');
          assert(w.portalMock.tasks.find(t=>t.id===w.portalMock.id(16)).status==='in_progress','different task not falsely submitted');
          d.getElementById('submit-work').click();await idle();
          assert(w.portalMock.submissions.length===3&&w.portalMock.tasks.find(t=>t.id===w.portalMock.id(16)).status==='submitted','preserved draft can subsequently submit');
        }else assert(form.elements.notes.value===''&&form.elements.drive_url.value==='','same task draft cleared after recovery');
        pass(different?'Lost response: recover previous task and preserve different draft':'Lost response: recover same task without duplicate');
      }
      await load('member');
      assert(d.querySelector('#due-tasks h4').textContent==='Community outreach','overdue first');
      assert(d.getElementById('due-tasks').compareDocumentPosition(d.getElementById('stats'))&w.Node.DOCUMENT_POSITION_FOLLOWING,'actions before stats');
      assert(d.querySelectorAll('#awaiting-tasks article').length===1,'awaiting review separate');
      w.portalMock.tasks.find(t=>t.id===w.portalMock.id(16)).due_date=null;
      d.getElementById('refresh').click();await idle();
      assert(d.getElementById('due-tasks').lastElementChild.querySelector('h4').textContent==='Final event report','undated active assignment included after upcoming work');
      nav('my');button(card('Volunteer guide'),'View submissions').click();
      assert(d.getElementById('document-filter-label').textContent.includes('Volunteer guide'),'documents scoped to clicked task');
      assert(d.querySelectorAll('#documents-list article').length===1&&!d.getElementById('clear-document-filter').hidden,'filtered documents');
      d.getElementById('clear-document-filter').click();assert(d.getElementById('clear-document-filter').hidden,'clear documents filter');
      pass('Action-first dashboard, undated work, awaiting review, and task-scoped documents');
      w.portalMock.failDocuments=true;d.getElementById('refresh').click();await idle();
      assert(d.getElementById('notice').hidden,'documents error stays out of global notice');nav('my');
      button(card('Community outreach'),'Start task').click();await idle();
      assert(w.portalMock.tasks.find(t=>t.id===w.portalMock.id(11)).status==='in_progress','status changes survive documents failure');
      nav('documents');assert(d.getElementById('documents-list').textContent.includes("couldn't load"),'documents error shown');
      w.portalMock.failDocuments=false;button(d.getElementById('documents-list'),'Retry Documents').click();
      await wait(()=>d.querySelector('#documents-list article'),'documents recovered');pass('Documents failure isolation and retry');
      for(const remove of [false,true]){
        await load('admin');nav('admin');button(card('Resource directory'),'Edit').click();form=d.getElementById('assignment-form');
        const current=w.portalMock.tasks.find(t=>t.id===w.portalMock.id(12));current.title='Newer saved title';current.updated_at='2035-01-01T00:00:00.000Z';
        if(!remove)field(form,'title','Stale title');d.getElementById(remove?'delete':'save').click();await idle();
        assert(w.portalMock.tasks.some(t=>t.id===current.id&&t.title==='Newer saved title'),'newer task preserved');
        assert(d.getElementById('notice').textContent.includes('list has been refreshed'),'conflict explained');
        assert(!d.getElementById('assignment-dialog').open&&card('Newer saved title'),'conflict refresh displays current task');
        pass(remove?'Stale admin deletion rejected':'Stale admin edit rejected');
      }
      await load('legacy-admin');nav('admin');d.getElementById('admin-members-tab').click();assert(d.querySelectorAll('#member-list .member-card').length===2,'member directory works before migration');d.querySelector('#member-list button').click();assert(!d.getElementById('member-detail').hidden,'legacy member detail');pass('Team Members works with the original schema; no v2 migration needed');
      await load('legacy');assert(d.getElementById('notice').textContent.includes('Some features are unavailable'),'feature availability banner');nav('turn-in');assert(d.getElementById('submit-work').disabled,'migration-gated submissions');pass('Original schema remains readable; new actions require migration');
      await load('empty');assert(d.getElementById('due-tasks').textContent.includes('No assignments need'),'empty dashboard');nav('documents');assert(d.getElementById('documents-list').textContent.includes('No submissions'),'empty docs');pass('Empty states');
      await load('member');w.portalMock.delay=250;d.getElementById('refresh').click();w.portalMock.auth('SIGNED_OUT',null);await new Promise(r=>setTimeout(r,400));assert(d.getElementById('workspace').hidden&&d.getElementById('my-tasks').children.length===0&&d.getElementById('member-list').children.length===0&&d.getElementById('member-detail-name').textContent==='','stale session cleared');pass('Sign-out clears private content and rejects late reads');
      pass('ALL BROWSER CHECKS COMPLETE');
    }catch(error){const li=document.createElement('li');li.className='fail';li.textContent='FAIL '+error.message;results.append(li);console.error(error);}
    finally{document.getElementById('run').disabled=false;}
  };
})();
