# What is it?

Pure TypeScript solunar table calculator.

# Installation

This package is only available from GitHub's package manager. Follow [these instructions](https://docs.github.com/en/packages/using-github-packages-with-your-projects-ecosystem/configuring-npm-for-use-with-github-packages) to configure npm for use with GitHub Packages. Then install this package by running:

```bash
npm install @stevenmusumeche/solunar
```

# Example Usage

```ts
const data = getSolunarData(
  { month: 6, day: 13, year: 2020, timeZone: "America/Chicago" },
  {
    lat: 29.47173,
    lon: -90.5561,
  }
);
```

# Result

```json
{
  "day": {
    "start": "2020-01-01T06:00:00.000Z",
    "end": "2020-01-02T06:00:00.000Z"
  },
  "dayScore": 2,
  "sun": {
    "rise": "2020-01-01T12:58:03.855Z",
    "set": "2020-01-01T23:15:25.116Z"
  },
  "moon": {
    "phaseName": "Waxing Crescent",
    "illumination": 33,
    "rise": "2020-01-01T17:24:30.839Z",
    "set": "2020-01-02T05:21:24.334Z",
    "overhead": "2020-01-01T23:21:00.000Z",
    "underfoot": "2020-01-01T11:01:00.000Z"
  },
  "majorPeriods": [
    {
      "type": "major",
      "start": "2020-01-01T10:01:00.000Z",
      "end": "2020-01-01T12:01:00.000Z",
      "weight": 1
    },
    {
      "type": "major",
      "start": "2020-01-01T22:21:00.000Z",
      "end": "2020-01-02T00:21:00.000Z",
      "weight": 1
    }
  ],
  "minorPeriods": [
    {
      "type": "minor",
      "start": "2020-01-01T16:54:30.839Z",
      "end": "2020-01-01T17:54:30.839Z",
      "weight": 0
    },
    {
      "type": "minor",
      "start": "2020-01-02T04:51:24.334Z",
      "end": "2020-01-02T05:51:24.334Z",
      "weight": 0
    }
  ]
}
```

# How it works

This package calculates a score for a particular day and location, as well as major and minor feeding times based on something called "Solunar Theory" by John Alden Knight. It is a hypothesis that fish and other animals move according to the location of the moon in comparison to their bodies. You can read a [more detailed description here](http://www.solunar.com/the_solunar_theory.aspx).

The key to accurate Solunar Times is the ability to chart the relative solar and lunar positions with respect to a particular location. The major periods coincide with the upper and lower meridian passage of the moon. In other words, when it is directly overhead and directly under foot. The minor periods occur when the moon is rising or setting on the horizon.

The scores for a day are are boosted when the major or minor periods fall within an hour or sunrise or sunset, as well as when there is a full or new moon.
