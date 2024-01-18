import fs from "fs";
import {NextFunction, Request, Response} from "express";
import JSONStream from "jsonstream";


export interface Cities {
    cities: City[]
}
export interface City {
    guid: string;
    isActive: boolean;
    address: string;
    latitude: number;
    longitude: number;
    tags: string[];
}

export interface Distance {
    from: City;
    to: City;
    unit: string;
    distance: number;
}

export let accumulatedCities: City[] = [];

export function checkToken(req: Request, res: Response, next: NextFunction) {
    const myToken = fs.readFileSync('./api/secret_auth_token.txt', 'utf-8');
    const theirToken = req.header('Authorization')?.split('bearer ')[1];

    if (!theirToken)
        return res.status(401).json({error: 'Unauthorized - Missing token'});

    if (theirToken == myToken) {
        next();
    } else {
        return res.status(401).json({error: 'Unauthorized - Invalid token'});
    }
}

export function filterJSONData(cities: City[], tag: string, isActive: string): Cities {
    if (!tag && !isActive)
        throw new Error('Missing parameter: either tag or isActive');

    if (tag)
        cities = cities.filter((city: any) => city.tags.includes(tag));

    if (isActive)
        cities = cities.filter((city: any) => city.isActive.toString() === isActive);

    return { cities: cities };
}

export function readJSONData(path: string): Cities {
    const cityObjects: City[] = JSON.parse(fs.readFileSync(path, 'utf-8'));
    return { cities: cityObjects };
}

export function sendJSONStream(cities: City[], res: Response) {
    const jsonStream = JSONStream.stringify();
    jsonStream.pipe(res);

    cities.forEach((city: City) => {
        jsonStream.write(JSON.stringify(city));
    })

    jsonStream.end();
}

export function getCityFromGuid(cities: City[], fromGuid: string): City {
    const foundCity: City | undefined = cities.find((city: City) => city.guid === fromGuid);
    if (!foundCity)
        throw new Error(`Cannot find city from guid: ${fromGuid}`);
    return foundCity;
}

export function getDistanceFromCities(cities: City[], from: string, to: string): Distance {
    const cityFrom: City = getCityFromGuid(cities, from);
    const cityTo: City = getCityFromGuid(cities, to);
    return {
        from: cityFrom,
        to: cityTo,
        unit: "km",
        distance: calculateDistance(cityFrom, cityTo)
    };
}

export function getCitiesWithinDist(cities: City[], from: string, distance: number) {
    accumulatedCities = [];
    const cityFrom = getCityFromGuid(cities, from);
    cities.forEach((cityTo: any) => {
        if (cityTo.guid !== cityFrom.guid && calculateDistance(cityFrom, cityTo) < distance)
            accumulatedCities.push(cityTo);
    })
}

function calculateDistance(cityFrom: City, cityTo: City): number {
    const R = 6371;

    const lat1 = degToRad(cityFrom.latitude);
    const lon1 = degToRad(cityFrom.longitude);
    const lat2 = degToRad(cityTo.latitude);
    const lon2 = degToRad(cityTo.longitude);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =  Math.pow(Math.sin(dLat / 2), 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.pow(Math.sin(dLon / 2), 2);

    // km
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 100) / 100;
}

function degToRad(deg: number): number {
    return deg * (Math.PI / 180);
}