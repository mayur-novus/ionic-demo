import {Component} from '@angular/core'
import {SQLite, SQLiteObject} from '@ionic-native/sqlite'
import {Toast} from "@ionic-native/toast";
import {LocalNotifications} from "@ionic-native/local-notifications";
import * as moment from 'moment';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  private dbRows = [];
  private schedulingTimeout: number = 0;
  private intervalTimeout = 5000;
  private database: SQLiteObject;
  private query = "";
  private results = [];
  private scheduledIds = "";
  private moment;

  constructor(private sqlite: SQLite, private toast: Toast, private localNotifications: LocalNotifications) {

    this.moment = moment;

  }

  ionViewDidEnter() {
    let that = this;
    that.getDatabaseResults().then((results: any) => {
      let items = results.rows.length
      for(let i=0; i < items; i++) {
        that.dbRows.push(results.rows.item(i))
      }
    }).catch(e => {
      that.toast.show(`${e.message}`, '5000', 'center');
    })

    that.schedulingTimeout = that.intervalTimeout / 1000;

    let intervalId = setInterval(() => {

      that.schedulingTimeout -= 1;

    }, 1000);

    setTimeout(() => {

      clearInterval(intervalId);
      that.schedulingTimeout = 0;
      that.scheduleNotifications();

    }, that.intervalTimeout)
  }

  scheduleNotifications() {
    let that = this;
    that.query = `SELECT * FROM notifications WHERE releaseFlag=1 AND notificationFlag=0 AND releaseDate="${moment().add(1, 'day').format("L")}"`
    that.database.executeSql(`SELECT * FROM notifications WHERE releaseFlag=1 AND notificationFlag=0 AND releaseDate="${moment().add(1, 'day').format("L")}"`, {}).then(result => {

      let items = result.rows.length
      for(let i=0; i < items; i++) {
        let row = result.rows.item(i);
        that.results.push(row)
        that.localNotifications.schedule({
          id: row.id,
          at: moment().add(1, 'day').hour(8).minutes(0).seconds(0).toDate(),
          text: `Local notification for date: ${row.releaseDate} with releaseFlag: ${row.releaseFlag}. This was the data with row id: ${row.id}`,
          data: row
        })
      }

      if(items > 0) {
        that.database.executeSql(`UPDATE notifications set notificationFlag=1 WHERE id IN (${that.results.map(r => r.id).join(", ")})`, {}).then((success) => {
          console.log(success)
        }).catch(e => console.error(e))

        that.getDatabaseResults().then((results: any) => {
          that.dbRows = [];
          let items = results.rows.length
          for(let i=0; i < items; i++) {
            that.dbRows.push(results.rows.item(i))
          }
        }).catch(e => {
          that.toast.show(`${e.message}`, '5000', 'center');
        })
      }

      setTimeout(() =>{
        that.query = "";
      }, 15000)

    })
  }

  getDatabaseResults() {
    let that = this;

    return new Promise((resolve, reject) => {
      that.sqlite.create({
        name: 'notifications-demo.db',
        location: 'default'
      }).then((db: SQLiteObject) => {
        that.database = db;
        db.executeSql(`
        CREATE TABLE IF NOT EXISTS notifications(
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          releaseFlag INTEGER, 
          releaseDate VARCHAR, 
          notificationFlag INTEGER
        )`, {}).then(() => {

          that.localNotifications.getScheduledIds().then(ids => {
            that.scheduledIds = ids.join(", ");
            let extendedQuery = ``;
            if(that.scheduledIds != "") {
              extendedQuery = ` WHERE id NOT IN (${that.scheduledIds})`;
            }
            that.database && that.database.executeSql(`UPDATE notifications SET notificationFlag=0${extendedQuery}`, {}).then(res => {
              db.executeSql(`SELECT * FROM notifications`, {}).then((result) => {
                if(result.rows.length > 0) {

                  resolve(result)

                } else {

                  db.executeSql(`INSERT INTO notifications (releaseFlag, releaseDate, notificationFlag) VALUES
                  (1, ${moment().format("L")}, 0),
                  (1, ${moment().add(1, 'day').format("L")}, 0),
                  (0, ${moment().add(2, 'days').format("L")}, 0),
                  (1, ${moment().add(3, 'days').format("L")}, 0),
                  (1, ${moment().add(4, 'days').format("L")}, 0),
                  (0, ${moment().add(5, 'days').format("L")}, 0),
                  (1, ${moment().add(6, 'days').format("L")}, 0),
                  (0, ${moment().add(7, 'days').format("L")}, 0),
                  (1, ${moment().add(8, 'days').format("L")}, 0),
                  (0, ${moment().add(9, 'days').format("L")}, 0),
                  (0, ${moment().add(10, 'days').format("L")}, 0),
                  (1, ${moment().add(11, 'days').format("L")}, 0),
                  (1, ${moment().add(12, 'days').format("L")}, 0),
                  (0, ${moment().add(13, 'days').format("L")}, 0)
                `, {}).then(() => {

                    db.executeSql(`SELECT * FROM notifications`, {}).then((result) => {

                      resolve(result)

                    }).catch(e => reject(e))

                  }).catch(e => reject(e))

                }

              }).catch(e => reject(e))

            }).catch(err => console.error(err));
          });

        }).catch(e => reject(e))

      }).catch(e => reject(e))
    })
  }

}
