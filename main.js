/* eslint-disable no-console */
require('universal-fetch');
const R = require('ramda');

const artists = [
  '7xZHrltZh8zIRvjimgABvj',
  '1uFG5Tg7iA7wd56RchxvWw',
  '4boY3fDYvqcujNmLZpQdbc',
  '4ksCwAPgMi8rkQwwR3nMos',
  '4ksdsPgMi8rkQwwR3nMos',
  '2tyMOS8xKREgpEwHnLc6EX',
  '0dmPX6ovclgOy8WWJaFEUU',
];

const baseURI = 'https://api.spotify.com';

const catchAll = console.error;

const checkData = (data) => {
  if (data.status === 200 && data.json) return data.json();
  else if (data.status === 404) throw new Error(`NOT FOUND : ${data.url}`);
  else {
    return data.json().then((json) => {
      throw new Error(`${json.error.message} : ${data.url}`);
    });
  }
};

const displayResult = step => data => console.log(`===== ${step} =====\n`, data);

const filterUndef = R.filter(R.identity);
const pluckNames = R.pluck('name');
const sort = R.sort(R.tolower);
const flat = R.chain(R.identity);
const takeTwo = R.take(2);
const sortByPop = R.sort((a, b) => -a.popularity - -b.popularity);
// const debug = str => (value) => { console.log(str, value); return value; };

const getArtist = id => fetch(`${baseURI}/v1/artists/${id}`)
  .then(checkData)
  .catch(catchAll);

const step1 = () => {
  const getNames = R.compose(sort, pluckNames, filterUndef);

  return Promise.all(R.map(getArtist, artists))
    .then(getNames)
    .catch(catchAll);
};

const getRelatedArtist = id => fetch(`${baseURI}/v1/artists/${id}/related-artists`)
  .then(checkData)
  .catch(catchAll);

const getTopArtists = id => fetch(`${baseURI}/v1/artists/${id}/top-tracks?country=FR`)
  .then(checkData)
  .catch(catchAll);

const step2 = () => {
  const getFirstTwoNames = R.compose(takeTwo, pluckNames, sortByPop);
  const getArtists = R.map(el => getFirstTwoNames(el.artists));
  const parseRelated = R.compose(flat, getArtists, filterUndef);
  const mergeAndSort = step1Data => R.compose(
    R.dropRepeats,
    sort,
    R.concat(step1Data),
    parseRelated);
  const allPromises = R.map(getRelatedArtist, artists);

  return step1()
    .then(step1Data => Promise.all(allPromises).then(mergeAndSort(step1Data)))
    .catch(catchAll);
};

const step3 = () => {
  const pluckId = R.pluck('id');
  const extractArtists = R.map(el => el.artists);
  const sortPop = R.sort((a, b) => -a[2] - -b[2]);
  const mergeIds = R.compose(R.dropRepeats, sort, R.concat(artists));
  const getTracks = R.map(el => el.tracks);
  const getNamePopArtist = R.map(el => [el.name, el.artists[0].name, el.popularity]);
  const getRelatedIds = R.compose(
    pluckId,
    R.dropRepeats,
    sort,
    flat,
    R.map(takeTwo),
    R.map(sortByPop),
    extractArtists,
    filterUndef);
  const parseSong = R.compose(
    R.take(5),
    sortPop,
    getNamePopArtist,
    flat,
    getTracks,
    flat,
    filterUndef);
  const relatedPromises = R.map(getRelatedArtist, artists);
  const allPromises = R.map(getTopArtists);

  return Promise.all(relatedPromises)
    .then(getRelatedIds)
    .then(mergeIds)
    .then(ids => Promise.all(allPromises(ids)))
    .then(parseSong)
    .catch(catchAll);
};

step1().then(displayResult('STEP1'));
step2().then(displayResult('STEP2'));
step3().then(displayResult('STEP3'));
