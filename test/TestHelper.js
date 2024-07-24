import C from '../health_modules/common';
import {areAnswersDefinedForCodedConcept} from './Concepts';
import _ from 'lodash';

class TestHelper {
    static findCodedValue = function (decisions, codedConceptName) {
        let values = C.findValue(decisions, codedConceptName);
        if (!areAnswersDefinedForCodedConcept(codedConceptName, values)) {
            throw Error(`Some of the answers: ${_.join(values, ',')} are not defined as answer for the concept:${codedConceptName}`);
        }
        return values;
    };

    static checkForInvalidDate = function (dateValue) {
        try {
            C.checkIfDateIsInvalid(dateValue, 'testDateFieldConceptName', 'entityName', 'entityUUID');
            return false
        } catch (e) {
            // console.log(e);
            return true;
        }
    };
}

export default TestHelper;