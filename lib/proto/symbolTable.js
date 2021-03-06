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

function symbolTable(worker, routineName) {
  routineName = routineName || 'ewdSymbolTable';
  return {
    clear: function() {
      var func = {
        function: 'clearSymbolTable^' + routineName
      };
      return worker.db.function(func);
    },
    save: function(session) {
      var gloRef = '^' + session.globalName + '("session",' + session.id + ',"ewd_symbolTable")';
      var func = 'saveSymbolTable^' + routineName;
      return worker.db.function(func, gloRef);
    },
    restore: function(session) {
      var gloRef = '^' + session.globalName + '("session",' + session.id + ',"ewd_symbolTable")';
      var func = 'restoreSymbolTable^' + routineName;
      return worker.db.function(func, gloRef);
    }
  };
}

module.exports = symbolTable;

