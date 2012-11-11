Meteor.startup(function() {
  if(!Accounts.loginServiceConfiguration.findOne()) { //if we just restarted the app and facebook login is not configured
    Accounts.loginServiceConfiguration.insert({
      service : "facebook", 
      appId : "457008651011649", //this is for localhost
      secret : "6c89e21415f919be11237b4310ba2dde" //this is for localhost
    });
    console.log("configured facebook login");
  }
});

Streams = new Meteor.Collection("streams");