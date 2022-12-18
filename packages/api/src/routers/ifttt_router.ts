import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { kx } from '../datalayer/knex_config'
import { createPubSubClient } from '../datalayer/pubsub'
import { initModels } from '../server'
import { createPageSaveRequest } from '../services/create_page_save_request'
import { getClaimsByToken } from '../utils/auth'
import { buildLogger } from '../utils/logger'

const logger = buildLogger('app.dispatch')

export function iftttRouter() {
  const router = express.Router()

  router.post('/v1/actions/save_url', async (req, res) => {
    const key = req.get('IFTTT-Service-Key')
    const { url } = req.body as {
      url?: string
    }

    if (key !== process.env.IFTTT_SERVICE_KEY) {
      res.status(401).send({
        errors: [
          {
            message: 'Channel/Service key is not correct',
          },
        ],
      })
    }

    const token = req?.cookies?.auth || req?.headers?.authorization
    const claims = await getClaimsByToken(token)
    if (!claims) {
      return res.status(401).send('UNAUTHORIZED')
    }

    const { uid } = claims
    const models = initModels(kx, false)

    const result = await createPageSaveRequest(
      uid,
      url,
      models,
      createPubSubClient(),
      uuidv4(),
      'low'
    )

    if (result.errorCode) {
      console.log('ifttt error saving url', url)
      res.status(500)
    }

    res.status(200).send({
      data: [
        {
          id: uuidv4(),
        },
      ],
    })
  })
}