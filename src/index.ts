import { addDays, addMinutes, isAfter, isWithinInterval } from "date-fns";
import { toDate } from "date-fns-tz";
import suncalc from "suncalc";

interface Point {
  lat: number;
  lon: number;
}

interface Day {
  month: number;
  day: number;
  year: number;
  timeZone: string;
}

export interface SolunarData {
  day: { start: Date; end: Date };
  dayScore: number;
  sun: { rise: Date; set: Date };
  moon: {
    phaseName: string;
    illumination: number;
    rise?: Date;
    set?: Date;
    overhead?: Date;
    underfoot?: Date;
  };
  majorPeriods: SolunarRange[];
  minorPeriods: SolunarRange[];
}

export function getSolunarData(day: Day, point: Point): SolunarData {
  const { start, end } = getDayBoundaries(day);

  const { sunrise, sunset } = suncalc.getTimes(end, point.lat, point.lon);

  const {
    moonrise,
    moonset,
    transitTimes,
    phase,
    phaseName,
    illumination,
  } = getMoonData(start, end, point);

  const solunarPeriods = enhanceSolunarRanges(
    calculateMajorMinorRanges(transitTimes, moonrise, moonset),
    sunrise,
    sunset
  );

  let dayScore = calculateDayScore(solunarPeriods, phaseName, phase);

  const overhead = transitTimes.find((x) => x.type === "over");
  const underfoot = transitTimes.find((x) => x.type === "under");

  return {
    day: { start, end },
    dayScore,
    sun: { rise: sunrise, set: sunset },
    moon: {
      phaseName,
      illumination,
      rise: moonrise,
      set: moonset,
      overhead: overhead?.timestamp,
      underfoot: underfoot?.timestamp,
    },
    majorPeriods: solunarPeriods.filter((x) => x.type === "major"),
    minorPeriods: solunarPeriods.filter((x) => x.type === "minor"),
  };
}

function getDayBoundaries(day: Day) {
  const start = toDate(new Date(day.year, day.month - 1, day.day), {
    timeZone: day.timeZone,
  });
  const end = addDays(start, 1);

  return { start, end };
}

function calculateDayScore(
  solunarPeriods: SolunarRange[],
  phaseName: string,
  phase: number
) {
  let dayScore = solunarPeriods.reduce((acc, cur) => {
    return acc + cur.weight;
  }, 0);
  if (["New Moon", "New Moon"].includes(phaseName)) {
    dayScore += 3;
  } else {
    if (
      (phase > 0.39 && phase < 0.61) ||
      (phase + 0.5 > 0.39 && phase + 0.5 < 0.61)
    ) {
      dayScore += 1;
    }

    if (
      (phase > 0.42 && phase < 0.55) ||
      (phase + 0.5 > 0.42 && phase + 0.5 < 0.55)
    ) {
      dayScore += 1;
    }
  }
  return dayScore;
}

function enhanceSolunarRanges(
  solunarRanges: SolunarRange[],
  sunrise: Date,
  sunset: Date
) {
  const sunriseRange = {
    start: addMinutes(sunrise, -60),
    end: addMinutes(sunrise, 60),
  };
  const sunsetRange = {
    start: addMinutes(sunset, -60),
    end: addMinutes(sunset, 60),
  };
  return solunarRanges
    .map((range) => {
      const nearSunrise =
        isWithinInterval(range.start, sunriseRange) ||
        isWithinInterval(range.end, sunriseRange);

      const nearSunset =
        isWithinInterval(range.start, sunsetRange) ||
        isWithinInterval(range.end, sunsetRange);

      return {
        ...range,
        weight: range.weight += nearSunrise || nearSunset ? 1 : 0,
      };
    })
    .sort((a, b) => (isAfter(a.start, b.start) ? 1 : -1));
}

interface SolunarRange {
  type: "major" | "minor";
  start: Date;
  end: Date;
  weight: number;
}
function calculateMajorMinorRanges(
  transitTimes: { timestamp: Date }[],
  moonrise?: Date,
  moonset?: Date
): SolunarRange[] {
  const ranges: SolunarRange[] = [];
  transitTimes.forEach((transitTime) => {
    ranges.push({
      type: "major",
      start: addMinutes(transitTime.timestamp, -60),
      end: addMinutes(transitTime.timestamp, 60),
      weight: 0,
    });
  });
  if (moonrise) {
    ranges.push({
      type: "minor",
      start: addMinutes(moonrise, -30),
      end: addMinutes(moonrise, 30),
      weight: 0,
    });
  }
  if (moonset) {
    ranges.push({
      type: "minor",
      start: addMinutes(moonset, -30),
      end: addMinutes(moonset, 30),
      weight: 0,
    });
  }

  return ranges;
}

function getMoonData(start: Date, end: Date, point: Point) {
  const { phaseName, phase, illumination } = getIllumination(start);

  // the library doesn't work with timezones so do this dumb thing
  let moonrise: Date | undefined;
  let moonset: Date | undefined;
  for (let i = -1; i <= 1; i++) {
    const { rise, set } = suncalc.getMoonTimes(
      addDays(start, i),
      point.lat,
      point.lon
    );

    if (isWithinInterval(rise, { start, end })) {
      moonrise = rise;
    }
    if (isWithinInterval(set, { start, end })) {
      moonset = set;
    }
  }

  const transitTimes = getMoonTransitTimes(start, end, point).sort((a, b) =>
    isAfter(a.timestamp, b.timestamp) ? 1 : -1
  );

  return {
    phase,
    phaseName,
    illumination,
    moonrise,
    moonset,
    transitTimes,
  };
}

function getMoonTransitTimes(start: Date, end: Date, { lat, lon }: Point) {
  let transitTimes = [];
  let curSign;
  for (let i = -60; i < 60 * 25; i++) {
    let tryingDate = addMinutes(start, i);
    const { azimuth, altitude } = suncalc.getMoonPosition(tryingDate, lat, lon);
    if (!curSign) curSign = Math.sign(azimuth);
    const tryingSign = Math.sign(azimuth);
    if (curSign !== tryingSign) {
      curSign = tryingSign;
      transitTimes.push({
        timestamp: tryingDate,
        type: altitude > 0 ? "over" : "under",
        altitude,
      });
    }
  }

  return transitTimes;
}

function getIllumination(date: Date) {
  const data = suncalc.getMoonIllumination(date);

  return {
    phaseName: calcPhaseName(data.phase),
    phase: data.phase,
    illumination: Math.round(data.fraction * 100),
  };
}

function calcPhaseName(phase: number): string {
  if (phase >= 0 && phase < 0.125) {
    return "New Moon";
  } else if (phase >= 0.125 && phase < 0.25) {
    return "Waxing Crescent";
  } else if (phase >= 0.25 && phase < 0.325) {
    return "First Quarter";
  } else if (phase >= 0.325 && phase < 0.5) {
    return "Waxing Gibbous";
  } else if (phase >= 0.5 && phase < 0.625) {
    return "Full Moon";
  } else if (phase >= 0.625 && phase < 0.75) {
    return "Waning Gibbous";
  } else if (phase >= 0.75 && phase < 0.825) {
    return "Last Quarter";
  } else if (phase >= 0.825 && phase <= 1) {
    return "Waning Crescent";
  }

  throw new Error("Out of bounds fraction");
}
