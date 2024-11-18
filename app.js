const express = require('express')
const app = express()
app.use(express.json())
const path = require('path')
const dbpath = path.join(__dirname, 'covid19India.db')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
let db = null
const initializedbandserver = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server started')
    })
  } catch (e) {
    console.log(`db error ${e.message}`)
    process.exit(1)
  }
}
initializedbandserver()

const converintostaesobj = dbobject => {
  return {
    stateId: dbobject.state_id,
    stateName: dbobject.state_name,
    population: dbobject.population,
  }
}

const convertintodistrictobj = dbobject => {
  return {
    districtId: dbobject.district_id,
    districtName: dbobject.district_name,
    stateId: dbobject.state_id,
    cases: dbobject.cases,
    cured: dbobject.cured,
    active: dbobject.active,
    deaths: dbobject.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const selectquery = 'select * from state order by state_id'
  const states = await db.all(selectquery)
  response.send(states.map(each => converintostaesobj(each)))
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const selectquery = `select * from state where state_id = ${stateId} `
  const states = await db.get(selectquery)
  response.send(converintostaesobj(states))
})

app.post('/districts/', async (request, response) => {
  const details = request.body
  const {districtName, stateId, cases, cured, active, deaths} = details
  const insertquery = `insert into district (district_name, state_id, cases,cured,active, deaths)
  values('${districtName}',
  ${stateId},
  ${cases},
  ${cured},
  ${active},
  ${deaths}   )`
  await db.run(insertquery)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const selectquery = `select * from district where district_id=${districtId}`
  const dist = await db.get(selectquery)
  response.send(convertintodistrictobj(dist))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deletequery = `delete from district where district_id=${districtId}`
  await db.run(deletequery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const details = request.body
  const {districtName, stateId, cases, cured, active, deaths} = details
  const updatebookquery = `update district set
   district_name='${districtName}',
   state_id=${stateId},
   cases=${cases},
   cured=${cured},
   active=${active},
   deaths=${deaths} where district_id=${districtId}`
  await db.run(updatebookquery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const seletequery = `select 
  sum(cases),
  sum(cured),
  sum(active),
  sum(deaths) from district where state_id=${stateId}`
  const stats = await db.get(seletequery)
  console.log(stats)
  response.send({
    totalCases: stats['sum(cases)'],
    totalCured: stats['sum(cured)'],
    totalActive: stats['sum(active)'],
    totalDeaths: stats['sum(deaths)'],
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictIdQuery = `
    select state_id from district
    where district_id = ${districtId};
    ` //With this we will get the state_id using district table
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery)
  const getStateNameQuery = `
    select state_name as stateName from state
    where state_id = ${getDistrictIdQueryResponse.state_id};
    ` //With this we will get state_name as stateName using the state_id
  const getStateNameQueryResponse = await db.get(getStateNameQuery)
  response.send(getStateNameQueryResponse)
}) //sending the required response

module.exports = app
