const functions = require('firebase-functions');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

const credential = require('./credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(credential),
  databaseURL: "https://showtimesapp-ba24a.firebaseio.com"
});

const dbh = admin.firestore();

const hashKey = '$2b$10$tD6O9dEpig9511b67tieOO';

const errorCodes = {
  INVALID_PARAMETER: 'Invalid parameter.',
}


exports.signup = functions.https.onRequest((request, response) => {
  const {email, password, fullName, role} = request.body;
  if (!email || !password || !fullName || (!role && role !== 0)) {
    response.status(500).send(`${errorCodes.INVALID_PARAMETER} Required email, password, fullName and role.`);
    return;
  }
  bcrypt.hash(password, hashKey, (err, hash) => {
    if (err) {
      response.status(500).send(err);
    }
    admin.auth().createUser({
      email,
      hash,
    })
      .then(userRecord => {
        const user = {
          email,
          fullName,
          role,
          hash,
        };
        dbh
          .collection('Users')
          .doc(userRecord.uid)
          .set(user)
          .then((item) => {
            response.send(userRecord.uid);
          })
          .catch((error) => {
            response.status(500).send(error);
          })
      })
      .catch(err => {
        response.status(500).send(err);
      })
  })
});

exports.signin = functions.https.onRequest((request, response) => {
  const {email, password} = request.body;
  if (!email || !password) {
    response.status(500).send(`${errorCodes.INVALID_PARAMETER} Required email and password.`);
    return;
  }
  bcrypt.hash(password, hashKey, (err, hash) => {
    if (err) {
      response.status(500).send(err);
    }
    admin.auth().getUserByEmail(email)
      .then(userRecord => {
        dbh
          .collection('Users')
          .doc(userRecord.uid)
          .get()
          .then((item) => {
            const user = item.data();
            if (hash === user.hash) {
              const result = {
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                uid: userRecord.uid,
              };
              response.send(result);
            } else {
              response.status(500).send('Password incorect');
            }
          })
          .catch((err) => {
            response.status(500).send(err);
          })
      })
      .catch((err) => {
        response.status(500).send(err);
      });
  })
});

exports.updateUser = functions.https.onRequest((request, response) => {
  const {uid, updateRole} = request.body;
  if (!uid || (!updateRole && updateRole !== 0)) {
    response.status(500).send(`${errorCodes.INVALID_PARAMETER} Required userID and userRole.`);
    return;
  }
  dbh
    .collection('Users')
    .doc(uid)
    .update({role: updateRole})
    .then(() => {
      response.send('Successfully updated');
    })
    .catch(err => {
      response.send(err);
    });
});

exports.deleteUser = functions.https.onRequest((request, response) => {
  const {uid} = request.body;
  if (!uid) {
    response.status(500).send(`${errorCodes.INVALID_PARAMETER} Required userID.`);
    return;
  }
  dbh
    .collection('Users')
    .doc(uid)
    .delete()
    .then(() => {
      admin.auth().deleteUser(uid)
        .then(() => {
          response.send('Successfully deleted');
        })
        .catch(err => {
          response.status(500).send(err);
        })
    })
    .catch(err => {
      response.send(err);
    });
});

exports.getAllUsers = functions.https.onRequest((request, response) => {
  dbh
    .collection('Users')
    .get()
    .then((items) => {
      const ret = [];
      items.forEach(doc => {
        const data = doc.data();
        const user = {
          email: data.email,
          fullName: data.fullName,
          uid: doc.id,
          role: data.role,
        };
        ret.push(user);
      });
      response.send(ret);
    })
    .catch(err => {
      response.status(500).send(err);
    })
});

exports.addTimezone = functions.https.onRequest((request, response) => {
  const {uid, timezone, city, gmt} = request.body;
  if (!uid || !timezone || !city || !gmt) {
    response.status(500).send(`${errorCodes.INVALID_PARAMETER} Required userID,  timezone, city, GMT.`);
    return;
  }
  const data = {
    timezone,
    city,
    userId: uid,
    gmt,
  }
  dbh
    .collection('Timezones')
    .add(data)
    .then(() => {
      response.send('Successfully created');
    })
    .catch(err => {
      response.status(500).send(err);
    });
});

exports.updateTimezone = functions.https.onRequest((request, response) => {
  const {timezoneId, timezone, city, gmt} = request.body;
  if (!timezoneId || !timezone || !city || !gmt) {
    response.status(500).send(`${errorCodes.INVALID_PARAMETER} Required timezoneID, timezone, city and GMT.`);
    return;
  }
  dbh
    .collection('Timezones')
    .doc(timezoneId)
    .update({timezone, city, gmt})
    .then(() => {
      response.send('Successfully updated');
    })
    .catch(err => {
      response.status(500).send(err);
    });
});

exports.deleteTimezone = functions.https.onRequest((request, response) => {
  const {timezoneId} = request.body;
  if (!timezoneId) {
    response.status(500).send(`${errorCodes.INVALID_PARAMETER} Required timezoneID.`);
    return;
  }
  dbh
    .collection('Timezones')
    .doc(timezoneId)
    .delete()
    .then(() => {
      response.send('Successfully deleted');
    })
    .catch(err => {
      response.status(500).send(err);
    });
});

exports.getAllTimezonesByUID = functions.https.onRequest((request, response) => {
  const {uid} = request.body;
  if (!uid) {
    response.status(500).send(`${errorCodes.INVALID_PARAMETER} Required userID.`);
    return;
  }
  dbh
    .collection('Timezones')
    .where('userId', '==', uid)
    .get()
    .then((items) => {
      const ret = [];
      items.forEach(doc => {
        const data = doc.data();
        const timezone = {
          city: data.city,
          timezone: data.timezone,
          timezoneId: doc.id,
          gmt: data.gmt,
        };
        ret.push(timezone);
      });
      response.send(ret);
    })
    .catch(err => {
      response.status(500).send(err);
    })
});

exports.getAllTimezones = functions.https.onRequest((request, response) => {
  dbh
    .collection('Timezones')
    .get()
    .then((items) => {
      const ret = [];
      items.forEach(doc => {
        const data = doc.data();
        const timezone = {
          city: data.city,
          timezone: data.timezone,
          timezoneId: doc.id,
          gmt: data.gmt,
        };
        ret.push(timezone);
      });
      response.send(ret);
    })
    .catch(err => {
      response.status(500).send(err);
    })
});