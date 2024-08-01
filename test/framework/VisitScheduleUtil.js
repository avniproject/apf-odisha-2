import {expect} from "@jest/globals";
import _ from "lodash";

export function notScheduled(...visits) {
    visits.forEach(visit => expect(_.isNil(visit)).toBeTruthy());
}

export function isScheduled(...visits) {
    visits.forEach(visit => expect(!_.isNil(visit)).toBeTruthy());
}
