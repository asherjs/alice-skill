const express = require('express');
const moment = require('moment');
const data = require('./data.json');

const port = process.env.PORT || 3000;
const app = express();

let scheduleDay, scheduleDate, isDay, dayIndex;
let schedules = data.schedules;

let days = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];

app.use(express.json());

app.post('/', function (req, res) {

  if (req.body.request.command == "no text")
  {
    respond('', false, req, res);
  }

  else if (req.body.request.command == "no version")
  {
    respond(req.body.request.command || randomAnswer(data.greetings), false, req, res);
  }

  else if (req.body.request.command == "no session")
  {
    respond(req.body.request.command || randomAnswer(data.greetings), false, req, res);
  }

  else if (req.body.request.command == "end session")
  {
    respond(req.body.request.command || randomAnswer(data.goodbyes), true, req, res);
  }

  else if (req.body.session.message_id == 0) 
  {
    respond(randomAnswer(data.greetings), false, req, res);
  }

  else if (isText(['помощь', 'помоги'], req)) 
  {
    respond(randomAnswer(['Назовите дату, чтобы узнать расписание уроков в этот день', 'Назовите день, расписание которого Вы хотите узнать']), false, req, res);
  }

  else if (isText(['умеешь'], req)) 
  {
    respond(randomAnswer(['Я знаю ваше школьное расписание и могу вам о нем рассказать. Назовите желаемую дату',
                          'Я могу рассказать Вам о вашем расписании. Назовите день, на который Вы хотите узнать расписание']), false, req, res);
  }

  else if (isText(['привет', 'здравствуйте'], req) )
  {
    respond(randomAnswer(data.greetingResponses), false, req, res);
  }

  else if (isText(['пока', 'свидания', 'прощай'], req) )
  {
    respond(randomAnswer(data.goodbyes), true, req, res);
  }

  else if (isText(['спасибо', 'благодарю'], req) )
  {
    let answers = ['Пожалуйста!', 'Рада помочь!', 'Обращайтесь'];
    respond(randomAnswer(data.goodbyes), false, req, res);
  }

  else if (isText('сейчас', req)) {                                                      // Называем урок, который идет в настоящий момент времени
    let now = moment();
    let day = now.day();
    let lesson = defineLesson(now);                                                      // Определяем урок исходя из текущего времени
    if(lesson === 'break') {
      respond(randomAnswer(['У вас перемена', 'Сейчас перемена']), false, req, res);
    } else if (lesson === null) {
      respond('На данный момент все уроки закончились', false, req, res);
    } else {
      if(JSON.stringify(schedules[day][lesson + 1])) {                                   // Проверяем, есть ли сейчас урок в расписании
        respond(JSON.stringify(schedules[day][lesson + 1]), false, req, res);
      } else {
        respond('На данный момент уроки закончились', false, req, res);
      }
    }
  }

  else { 
    let isDate = req.body.request.nlu.entities.find(req => req.type === 'YANDEX.DATETIME');
    for (let i = 0; i < days.length; i++) {
      isDay = req.body.request.nlu.tokens.indexOf(days[i]);
      if(isDay !== -1) dayIndex = i;
    }
    if(isDate) {
      let date = moment();
      let day = date.day();
      let dateValue = req.body.request.nlu.entities.find(req => req.type === 'YANDEX.DATETIME').value;
      if(dateValue.day_is_relative === true) {
        scheduleDay = (day + dateValue.day)%7;
        if(day < 0) scheduleDay = 7 + scheduleDay; 
        scheduleDay = scheduleDay.toString();
        console.log(scheduleDay);
      } else {
        scheduleDate = moment([date.year(), dateValue.month - 1, dateValue.day]);
        scheduleDay = scheduleDate.day();
      }
      respond(JSON.stringify(concatLessons(schedules[scheduleDay])), false, req, res);
      isDate = false;
    } else if (dayIndex !== null) {
      respond(JSON.stringify(concatLessons(schedules[dayIndex])), false, req, res);
      dayIndex = null;
    } else {
      let answers = ['У меня Вы можете узнать Ваше расписание. ', 'Расписание какого дня Вас интересует?', 'На какой день Вы хотите узнать расписание?'];
      respond(randomAnswer(answers), false, req, res);
    };
  }
});

app.use('*', function (req, res) {
  res.sendStatus(404);
});

app.listen(port);

function respond(text, isEnd, req, res) {
  res.json({
      version: req.body.version,
      session: req.body.session,
      response: {
        text: text,
        end_session: isEnd,
      },
    });
}

function randomAnswer(arr) {                                                            // Функция, добавляющая вариативность ответа Алисы
  let rand = Math.floor(Math.random() * arr.length);
  return arr[rand];
}

function isText(text, req) {                                                            // Функция, определяющая наличие указанного слова в запросе
  let existence = false;
  if(Array.isArray(text)) {
    for(let i = 0; i < text.length; i++) {
      req.body.request.nlu.tokens.indexOf(text[i]) != -1 ? existence = true : '';
    }
  } else {
    existence = req.body.request.nlu.tokens.indexOf(text) != -1;
  }
  return existence;
}

function concatLessons(dayArr) {
  let lessonsString = '';
  for(let i = 0; i < dayArr.length; i++) {
    lessonsString += dayArr[i];
  }
  return lessonsString;
}

function defineLesson(time) {                                                           // Функция, которая определяет какой урок идет во время запроса
  let lessonDurations = [
    moment('8:30', 'HH:mm'), moment('9:15', 'HH:mm'),
    moment('9:25', 'HH:mm'), moment('10:10', 'HH:mm'), 
    moment('10:20', 'HH:mm'), moment('11:05', 'HH:mm'),
    moment('11:20', 'HH:mm'), moment('12:05', 'HH:mm'),
    moment('12:20', 'HH:mm'), moment('13:05', 'HH:mm'),
    moment('13:15', 'HH:mm'), moment('14:00', 'HH:mm'),
    moment('14:10', 'HH:mm'), moment('14:55', 'HH:mm')
  ];
  let durationNumber, lesson;
  for(let i = 0; i < lessonDurations.length + 1; i++) {
    if(time.isBetween(lessonDurations[i], lessonDurations[i+1])) {
      durationNumber = i;
    } else {
      return null;
    }
  }
  return durationNumber % 2 === 0 ? (durationNumber/2) : 'break';
}


