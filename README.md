# ewd-globals-session: Session Management based on ewd-globals
 
Rob Tweed <rtweed@mgateway.com>  
24 February 2016, M/Gateway Developments Ltd [http://www.mgateway.com](http://www.mgateway.com)  

Twitter: @rtweed

Google Group for discussions, support, advice etc: [http://groups.google.co.uk/group/enterprise-web-developer-community](http://groups.google.co.uk/group/enterprise-web-developer-community)


## ewd-globals-session

This module may be used to provide session management.  Sessions make use of the persistent JavaScript object projection and 
fine-grained document database abstraction provided by ewd-globals.  For more information on ewd-globals:

         [https://github.com/robtweed/ewd-globals](https://github.com/robtweed/ewd-globals)

You'll usually use ewd-globals-session within an ewd-qoper8 worker process.  For more informaation on ewd-qoper8:

         [https://github.com/robtweed/ewd-qoper8](https://github.com/robtweed/ewd-qoper8)


## Installing

       npm install ewd-globals-session
	   
## Using ewd-globals-session

If you are using ewd-globals-session within an ewd-qoper8 worker process, you must first have connected the worker to a
database that is supported by ewd-globals, eg:

- InterSystems Cache, using ewd-qoper8-cache: [https://github.com/robtweed/ewd-qoper8-cache](https://github.com/robtweed/ewd-qoper8-cache)
- InterSystems GlobalsDB (module not yet implemented)
- GT.M (module not yet implemented)

Specifically, ewd-globals-session expects the worker process to have instantiated a globalStore object, which is what these
database-specific modules will have done when invoked within the worker's 'start' event handler, eg:

      worker.on('start', function(isFirst) {
        var connectCacheTo = require('ewd-qoper8-cache');
        connectCacheTo(this);
      });



In order to create and use Sessions, you must load the ewd-globals-session module into both your ewd-qoper8 
master and local modules:

      var sessions = require('ewd-globals-session');

This provides you with the following constructors and methods:

- Session:            constructor for instantiating a Session object
- Token:              constructor for instantiating a Session Token object
- tokenAuthenticate:  method for authenticating a Session Token and returning the corresponding Session object if valid
- garbageCollector:   timer for use within the ewd-qoper8 master process, for garbage-collecting expired Sessions
- expiryHandler:      method for use within the worker process, to create an event handler that clears down expired Sessions
- uuid:               method for generating a UUID
- symbolTable         creates methods for maintaining the connected MUMPS process's symbol table (aka local variables)


### Session Garbage Collection

It is important to enable Session Garbage collection, otherwise your Global Store will accumulate expired session data.

You should start the Session Garbage collector timer in the master process - do this within the ewd-qoper8 on('started') hander:

      q.on('started', function() {
        sessions.garbageCollector(q);
        // ....etc
      });

Every 5 minutes, this timer puts a message on the queue that will be handled in the assigned worker.

Within your worker module, you must add the handler for these messages

      this.on('globalStoreStarted', function() {
        sessions.expiryHandler(this);
      });

This handler tells the worker to find all Sessions that have expired and clear them down.

All other Session activity occurs in your worker module.


### Creating a New Session

To create a new Session:

      var session = new sessions.Session(this.globalStore);
      var applicationName = 'vista';
      var sessionTimeout = 300;  // in seconds; defaults to 3600 = 1 hour
      var token = session.create(application, sessionTimeout);

By default, Sessions are maintained in a Global named ^%zewdSession.  You can change this in the Session constructor call, eg:

      var session = new sessions.Session(this.globalStore, null, null, 'mySessionGlobal');

You'll be returned a session object which provides access to the underlying GlobalNode storing the session's data.

A Token Object will also have been created.  This provides a pointer from the session's unique token to the Session.  Under normal
circumstances you'll not directly access the Token Object.

Normally you'll send the Session token value (session.token) back to the client / browser.  It is used for subsequent, secure
access to the Session the next time the user or client requires access to their Session.

### The Session Object

#### Properties

- exists         (boolean; read only)
- token          (string: read only) The unique token UUID that was created for this session
- expired        (boolean: read only)
- authenticated  (boolean: read/write) Set this to true when the user successfully logs in (if relevant)
- expiryTime     (integer: read/write) The number of seconds before the Session will expire if inactive
- data           (ewd-globals GlobalNode Object) Points to the underlying Session persistent data

#### Methods

- delete()   deletes the Session and its associated Token object.  Normally you can let sessions just expire naturally, so 
use of this method is usually unnecessary.

- create(applicationName, [expiryTime || 300])  creates a new Session and associated Token object.  Returns a Session object


### Accessing a Session using a Token

You'll normally send a Session token as part of a message to your worker module.  In the case of Express HTTP requests, the
token will normally be conveyed as the Authorization header value.  In WebSocket messages, you can allocate an appropriate
message property to hold it.

To access the associated Session, use the tokenAuthenticate method which must be invoked using call(this, token):

      var results = sessions.tokenAuthenticate.call(this, token);

      where token is the value of the Session Token

results is an object of the structure:

     {
       error: errorMessage,
       session: SessionObject
     }


results.session will contain the associated Session object if:

- the token value was not null or a null string
- the token was found in the Token global store
- a corresponding Session was found in the global store
- the corresponding Session had not expired

Otherwise results.error will be defined and will be a string value that explains the reason why a Session object could not be returned.

By default, a successful invocation of the sessions.tokenAuthenticate() method will update the associated Session's expiry time.  In certain
circumstances you might not want this to happen, for example if you want to log in the user.  In such a situation, if the login
credentials aren't correct, you'll want to keep the clock ticking in terms of the remaining time you allow before the user can
log in.

In such a situation, add true as a third argument:

      var session = sessions.tokenAuthenticate.call(this, token, true);


If you're using a different Global for the Session's global storage, add it as a fourth argument, eg:

      var session = sessions.tokenAuthenticate.call(this, token, true, 'mySessionGlobal');

       or

      var session = sessions.tokenAuthenticate.call(this, token, false, 'mySessionGlobal');



## License

 Copyright (c) 2016 M/Gateway Developments Ltd,                           
 Reigate, Surrey UK.                                                      
 All rights reserved.                                                     
                                                                           
  http://www.mgateway.com                                                  
  Email: rtweed@mgateway.com                                               
                                                                           
                                                                           
  Licensed under the Apache License, Version 2.0 (the "License");          
  you may not use this file except in compliance with the License.         
  You may obtain a copy of the License at                                  
                                                                           
      http://www.apache.org/licenses/LICENSE-2.0                           
                                                                           
  Unless required by applicable law or agreed to in writing, software      
  distributed under the License is distributed on an "AS IS" BASIS,        
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
  See the License for the specific language governing permissions and      
   limitations under the License.      
