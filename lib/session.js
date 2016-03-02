/*

 ----------------------------------------------------------------------------
 | ewd-globals-session: Session management using ewd-globals                |
 |                                                                          |
 | Copyright (c) 2016 M/Gateway Developments Ltd,                           |
 | Reigate, Surrey UK.                                                      |
 | All rights reserved.                                                     |
 |                                                                          |
 | http://www.mgateway.com                                                  |
 | Email: rtweed@mgateway.com                                               |
 |                                                                          |
 |                                                                          |
 | Licensed under the Apache License, Version 2.0 (the "License");          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an "AS IS" BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

*/

var uuid = require('node-uuid');

// ======== Token ==================

function Token(globalStore, token, globalName) {
  globalName = globalName || '%zewdSession';
  this.globalName = globalName;
  this.globalStore = globalStore;
  var tokenGlo = new globalStore.GlobalNode(globalName, ['sessionsByToken']);
  if (!token) token = uuid.v4();
  this.value = token;
  this.data = tokenGlo.$(token);
}

var proto = Token.prototype;

Object.defineProperty(proto, 'session', {
  get: function() {
    var session = new Session(this.globalStore, this.sessionId, false, this.globalName);
    if (!session.exists) return false;
    if (session.expired) return false;
    return session;
  }
});

Object.defineProperty(proto, 'sessionId', require('./proto/token/sessionId'));
Object.defineProperty(proto, 'exists', require('./proto/token/exists'));

proto.delete = require('./proto/token/delete');


// ===== Session =========================

function Session(globalStore, id, updateExpiry, globalName) {
  globalName = globalName || '%zewdSession';
  this.globalName = globalName;
  this.globalStore = globalStore;
  if (id) {
    this.id =id;
  }
  else {
    this.id = this.next();
  }
  this.data = new globalStore.GlobalNode(globalName, ['session', this.id]);
  if (updateExpiry !== false) this.updateExpiry(); // will be deleted if expired already
}

proto = Session.prototype;

Object.defineProperty(proto, 'exists', require('./proto/session/exists'));
Object.defineProperty(proto, 'token', require('./proto/session/token'));
Object.defineProperty(proto, 'expired', require('./proto/session/expired'));
Object.defineProperty(proto, 'authenticated', require('./proto/session/authenticated'));
Object.defineProperty(proto, 'expiryTime', require('./proto/session/expiryTime'));

proto.next = require('./proto/session/next');
proto.updateExpiry = require('./proto/session/updateExpiry');

proto.delete = function() {
  var token = new Token(this.globalStore, this.token, this.globalName);
  token.delete();
  this.data._delete();
};

proto.create = function(application, timeout) {
  this.data._delete();
  var token = new Token(this.globalStore, null, this.globalName);
  token.sessionId = this.id;
  var now = Math.floor(new Date().getTime()/1000);
  timeout = timeout || 3600;
  var expiry = now + timeout;

  var params = {
    ewd_token: token.value,
    ewd_sessid: this.id,
    ewd_sessionTimeout: timeout,
    ewd_sessionExpiry: expiry,
    ewd_appName: application,
    ewd_authenticated: 0
  };
  this.data._setDocument(params);
  return token.value;
};

// ================================

function expiry(worker, globalName) {
  globalName = globalName || '%zewdSession';
  worker.on('ewd-globals-session.clearExpiredSessions', function(messageObj, send, finished) {
    var sessGlo = new worker.globalStore.GlobalNode(globalName, ['session']);
    sessGlo._forEach(function(id) {
      var session = new Session(worker.globalStore, id, false);
      var ok = session.expired; // deletes expired ones
      if (ok) console.log('session ' + id + ' deleted');
    });
    finished();
  });
}

var symbolTable = require('./proto/symbolTable');
var garbageCollector = require('./proto/garbageCollector');

function tokenAuthenticate(token, loggingIn, globalName) {
  if (!token) return {
    error: 'Missing authorization header',
    status: {
      code: 403,
      text: 'Forbidden'
    }
  };
  var session = new Token(this.globalStore, token, globalName).session;
  if (!session.exists) return {
    error: 'Invalid token or session expired',
    status: {
      code: 403,
      text: 'Forbidden'
    }
  };
  if (session.expired) return {
    error: 'Session expired',
    status: {
      code: 403,
      text: 'Forbidden'
    }
  };
  if (loggingIn === true) {
    if (session.authenticated) return {
      error: 'User already logged in',
      status: {
      code: 403,
      text: 'Forbidden'
      }
    };
  }
  else {
    if (!session.authenticated) return {
      error: 'User has not logged in',
      status: {
      code: 403,
      text: 'Forbidden'
      }
    };
    session.updateExpiry();
  }
  return {session: session};
}

module.exports = {
  Token: Token,
  Session: Session,
  uuid: uuid.v4(),
  symbolTable: symbolTable,
  garbageCollector: garbageCollector,
  expiryHandler: expiry,
  tokenAuthenticate: tokenAuthenticate
};
