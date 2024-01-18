import express, { Request, Response } from 'express';
import * as utility from './helpers';

const protocol = 'http';
const host = '127.0.0.1';
const port = 8080;
const server = `${protocol}://${host}:${port}`;

const apiListHelp: string[] = [
    '/cities-by-tag: "tag", "isActive"',
    '/distance: "from", "to"',
    '/area: "from", "distance"',
    '/area-result/2152f96f-50c7-4d76-9e18-f7033bd14428',
    '/all-cities']

const app = express();

const data : utility.Cities = utility.readJSONData('addresses.json');

app.get('/', (req: Request, res: Response) => {
    res.send("Welcome to the server");
})

app.get('/cities-by-tag', utility.checkToken, (req: Request, res: Response) => {
    try {
        const tag: string = req.query.tag as string;
        const isActive: string = req.query.isActive as string;
        const filteredData: utility.Cities = utility.filterJSONData(data.cities, tag, isActive);
        res.json(filteredData);
    } catch (error) {
        console.error('Error:', error);
        res.status(400).json({error: `${error}`});
    }
})

app.get('/distance', utility.checkToken, (req: Request, res: Response) => {
    try {
        const from: string = req.query.from as string;
        const to: string = req.query.to as string;
        const distance: utility.Distance = utility.getDistanceFromCities(data.cities, from, to);
        res.json(distance);
    } catch (error) {
        console.error('Error:', error);
        res.status(400).json({error: 'Invalid city params'})
    }
})

app.get('/area', utility.checkToken, async (req: Request, res: Response) => {
    try {
        // Send 202 as we need time to compute
        res.status(202).send({resultsUrl: `${server}/area-result/2152f96f-50c7-4d76-9e18-f7033bd14428`});

        const from: string = req.query.from as string;
        const distance: number = +(req.query.distance as string); // cast to int
        utility.getCitiesWithinDist(data.cities, from, distance);

    } catch (error) {
        console.error('Error', error);
        res.status(500).json({error: 'Error while computing distance to cities'});
    }
})

app.get('/area-result/2152f96f-50c7-4d76-9e18-f7033bd14428', utility.checkToken, (req: Request, res: Response) => {
    res.json({cities: utility.accumulatedCities});
})

app.get('/all-cities', utility.checkToken, (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    try {
        utility.sendJSONStream(data.cities, res);
    } catch (error) {
        console.error('Error:', error);
        res.status(400).json({error: 'Cannot write to client'})
    }
})

app.listen(port, host, () => {
    console.log(`Server is running at ${server}`);
    console.log('Api Endpoints:')
    apiListHelp.forEach((endpoint: string) => {
        console.log(`${endpoint}`);
    })
})