(function(){
  var backup = localStorage.getItem('legiit_services_backup');
  if (backup) {
    var data = JSON.parse(backup);
    data.sort(function(a,b){return (b.rc||0)-(a.rc||0);});
    var output = {total: data.length, generated_at: new Date().toISOString(), services: data};
    var blob = new Blob([JSON.stringify(output,null,2)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'legiit-services-' + data.length + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log('已下載 ' + data.length + ' 條數據');
  } else {
    console.log('暫無數據');
  }
})();