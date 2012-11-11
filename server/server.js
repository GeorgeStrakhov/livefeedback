Meteor.startup(function() {
  if(!Accounts.loginServiceConfiguration.findOne()) { //if we just restarted the app and facebook login is not configured
    if(Meteor.absoluteUrl() == "http://localhost:3000/") {
      Accounts.loginServiceConfiguration.insert({
        service : "facebook", 
        appId : "457008651011649", //this is for localhost
        secret : "6c89e21415f919be11237b4310ba2dde" //this is for localhost
      });
    } else {
      Accounts.loginServiceConfiguration.insert({
        service : "facebook", 
        appId : "521808017829644", //this is for livefeedback.mobi
        secret : "49bb7952ef7dda24bc7a2701e689ec16" //this is for livefeedback.mobi
      });    
    }
    console.log("configured facebook login");
  }
});


Streams = new Meteor.Collection("streams");
