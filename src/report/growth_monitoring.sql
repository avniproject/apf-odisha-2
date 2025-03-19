------------------Create table script-----------------------------------------



CREATE TABLE apfodisha.individual_child_growth_monitoring_report (
	"Block" text NULL,
	"GP" text NULL,
	"Village/Hamlet" text NULL,
	"Project/Block" text NULL,
	"Sector" text NULL,
	"AWC" text NULL,
	"HH ID" int4 NULL,
	"Beneficiary ID" int4 NULL,
	"Name of Child Benefeciaries" text NULL,
	"Date of Birth" date NULL,
	"Father's name" text NULL,
	"Mother's Name" text NULL,
	"Date of Measurement" date null,
	"Severely Underweight" text null,
	"Moderately Underweight" text null,
	"SAM" text null,
	"Is it a relapse child (Yes/No)" text null,
	"Was the child facilitated to CHC by QRT" text null,
	"Was the child admitted to NRC before" text null,
	"MAM" text null,
	"Moderately Stunted" text null,
	"Severely Stunted" text null,
	"Growth Falter Status (GF-1/GF-2)" text null,
	"Height" numeric NULL,
	"Weight" numeric NULL,
	"Is the child going to PPK?" text NULL,
	"Is the child going to Creche?" text NULL,
	"Is the child being currently exclusively breastfed?" text NULL,
	"Is the child being currently breastfed?" text NULL,
	"Number of day attended AWC (last month)" numeric NULL,
	"Is the child receiving egg from AWC" text NULL,
	"Is the child receiving THR from AWC" text NULL,
	"Did the child attended VHND last month" text NULL,
	"What is the treatment advise for the SAM/MAM/GF2 child?" text NULL,
	"Is the child enrolled in the CMAM program?" text NULL,
	"Is the child availing benefits (ATHR) under the CMAM program?" text NULL,
	"Did you receive additional THR (MSPY)?" text NULL,
	"Date of Last SAM" date null,
	"Date of Last MAM" date null
);

----------------------Insert individual script--------------------------------------------



INSERT INTO apfodisha.individual_child_growth_monitoring_report (
    "Block",
    "GP",
    "Village/Hamlet",
    "Project/Block",
    "Sector",
    "AWC",
    "HH ID",
    "Beneficiary ID",
    "Name of Child Beneficiaries",
    "Date of Birth",
    "Father's name",
    "Mother's Name",
    "Date of Measurement",
    "Severely Underweight",
    "Moderately Underweight",
    "SAM",
    "Is it a relapse child (Yes/No)",
    "Was the child facilitated to CHC by QRT",
    "Was the child admitted to NRC before",
    "MAM",
    "Moderately Stunted",
    "Severely Stunted",
    "Growth Falter Status (GF-1/GF-2)",
    "Height",
    "Weight",
    "Is the child going to PPK?",
    "Is the child going to Creche?",
    "Is the child being currently exclusively breastfed?",
    "Is the child being currently breastfed?",
    "Number of day attended AWC (last month)",
    "Is the child receiving egg from AWC",
    "Is the child receiving THR from AWC",
    "Did the child attended VHND last month",
    "What is the treatment advise for the SAM/MAM/GF2 child?",
    "Is the child enrolled in the CMAM program?",
    "Is the child availing benefits (ATHR) under the CMAM program?",
    "Did you receive additional THR (MSPY)?",
    "Date of Last SAM",
    "Date of Last MAM"
)
SELECT
    ind.id AS "Beneficiary ID",
    concat(ind.first_name, ' ', ind.last_name) AS "Name of Child Beneficiaries",
    ind.date_of_birth as "Date of Birth",
    ind."Father/Husband's name" AS "Father's name",
    ind."Mother's Name"
FROM
    apfodisha.individual ind
    JOIN
        apfodisha.individual_child enrl ON
            enrl.individual_id = ind.id
            AND enrl.enrolment_date_time IS NOT NULL
            AND enrl.is_voided = false
    JOIN
        apfodisha.individual_child_growth_monitoring follow_up ON
            follow_up.program_enrolment_id = enrl.id
            AND follow_up.encounter_date_time IS NOT NULL
            AND follow_up.is_voided = false
WHERE
    ind.is_voided = false
    AND ind.created_date_time <= :input_date;



---------------------------Last SAM and MAM Script--------------------------------


WITH last_sam_mam AS (
    SELECT DISTINCT
        ind.id AS "Individual ID",
        CASE
            WHEN ROW_NUMBER() OVER (
                PARTITION BY follow_up.individual_id, follow_up.program_enrolment_id
                ORDER BY follow_up.encounter_date_time DESC NULLS LAST
            ) = 1
            AND follow_up."Weight for Height Status" = 'SAM'
            and	follow_up.last_modified_date_time >= :date
            THEN follow_up.encounter_date_time
            ELSE NULL
        END AS "Date of Last SAM",
        CASE
            WHEN ROW_NUMBER() OVER (
                PARTITION BY follow_up.individual_id, follow_up.program_enrolment_id
                ORDER BY follow_up.encounter_date_time DESC NULLS LAST
            ) = 1
            AND follow_up."Weight for Height Status" = 'MAM'
            and	follow_up.last_modified_date_time >= :date
            THEN follow_up.encounter_date_time
            ELSE NULL
        END AS "Date of Last MAM"
    FROM
        apfodisha.individual ind
    JOIN
        apfodisha.individual_child enrl ON
            enrl.individual_id = ind.id
            AND enrl.enrolment_date_time IS NOT NULL
            AND enrl.is_voided = false
   LEFT JOIN
        apfodisha.individual_child_growth_monitoring follow_up ON
            follow_up.program_enrolment_id = enrl.id
            AND follow_up.encounter_date_time IS NOT NULL
            AND follow_up.is_voided = false
            and follow_up.last_modified_date_time > :date

)
UPDATE
    apfodisha.individual_child_growth_monitoring_report growth_report
SET
    "Date of Last SAM" = lsm."Date of Last SAM",
    "Date of Last MAM" = lsm."Date of Last MAM"
FROM
    last_sam_mam lsm
WHERE
    growth_report."Beneficiary ID" = lsm."Individual ID";



---------------------------------------NRC status script-----------------------
WITH cte_nrc_status AS (
    SELECT DISTINCT
        ind.id AS "Individual ID",
        CASE
            WHEN nrc."Admission Status" = 'Admited' THEN 'Yes'
            WHEN nrc."Admission Status" IS NULL THEN 'No'
            ELSE 'No'
        END AS "Was the child admitted to NRC before"
    FROM
        apfodisha.individual ind
    JOIN apfodisha.individual_child enrl
        ON enrl.individual_id = ind.id
        AND enrl.enrolment_date_time IS NOT NULL
    LEFT JOIN apfodisha.individual_child_growth_monitoring follow_up
        ON follow_up.program_enrolment_id = enrl.id
        AND follow_up.encounter_date_time IS NOT NULL
    LEFT JOIN apfodisha.individual_child_qrt_child qrt
        ON qrt.individual_id = follow_up.individual_id
        AND qrt.encounter_date_time IS NOT NULL
    LEFT JOIN apfodisha.individual_child_nrc nrc
        ON nrc.individual_id = qrt.individual_id
        AND qrt.encounter_date_time IS NOT null
        and qrt.last_modified_date_time > :date
)
UPDATE apfodisha.individual_child_growth_monitoring_report growth_report
SET "Was the child admitted to NRC before" = cte."Was the child admitted to NRC before"
FROM cte_nrc_status cte
WHERE growth_report."Beneficiary ID" = cte."Individual ID";




---------------------------------Relapse Child Script------------------------------------------------------


WITH relapse_data AS (
    SELECT DISTINCT
        ind.id AS "Individual ID",
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM apfodisha.individual_child_growth_monitoring f
                WHERE f.individual_id = follow_up.individual_id
                AND f.program_enrolment_id = follow_up.program_enrolment_id
                AND f."Weight for Height Status" = 'SAM'
                AND f.encounter_date_time < date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' * :month_interval
            )
            AND follow_up."Weight for Height Status" = 'SAM'
            AND NOT EXISTS (
                SELECT 1
                FROM apfodisha.individual_child_growth_monitoring f2
                WHERE f2.individual_id = follow_up.individual_id
                AND f2.program_enrolment_id = follow_up.program_enrolment_id
                AND f2."Weight for Height Status" = 'SAM'
                AND f2.encounter_date_time >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' * :month_interval
            ) THEN 'Yes'
            ELSE 'No'
        END AS "Is it a relapse child"
    FROM
        apfodisha.individual ind
    JOIN apfodisha.individual_child enrl ON
        enrl.individual_id = ind.id
        AND enrl.enrolment_date_time IS NOT NULL
        AND enrl.is_voided = false
   LEFT JOIN apfodisha.individual_child_growth_monitoring follow_up ON
        follow_up.program_enrolment_id = enrl.id
        AND follow_up.encounter_date_time IS NOT NULL
        AND follow_up.is_voided = false
        and follow_up.last_modified_date_time > :date
)
UPDATE apfodisha.individual_child_growth_monitoring_report growth_report
SET "Is it a relapse child" = cte."Is it a relapse child"
FROM relapse_data cte
WHERE growth_report."Beneficiary ID" = cte."Individual ID";





---------------------------------------Village Fields Update script---------------------------------------



WITH village_fields AS (
SELECT
    village."Block",
    village."GP",
    village."Village/Hamlet",
    ind.id AS "Individual ID",
    FROM
        apfodisha.individual ind
    LEFT JOIN apfodisha.address village ON
    	village.id = ind.address_id
    	AND village.is_voided = false
        )
UPDATE
    apfodisha.individual_child_growth_monitoring_report growth_report
SET
    "Block" = fld."Block",
    "GP" = fld."GP",
    "Village/Hamlet" = fld."Village/Hamlet"
FROM
    village_fields fld
WHERE
    growth_report."Beneficiary ID" = fld."Individual ID";




---------------------------------------AWC fields update script------------------------------------------------


WITH awc_fields AS (
SELECT
    awc."Project/Block",
    awc."Sector",
    awc."AWC",
    house.id,
    ind.id AS "Individual ID",
    FROM
        apfodisha.individual ind
    LEFT JOIN apfodisha.household_individual gs ON
    	gs.member_subject_id = ind.id
    	AND gs.is_voided = FALSE
    LEFT JOIN apfodisha.household house ON
    	gs.group_subject_id = house.id
    	AND house.is_voided = false
    LEFT JOIN apfodisha.address awc ON
    	awc.uuid = house."AWC Name"
    	AND awc.is_voided = false
)
UPDATE
    apfodisha.individual_child_growth_monitoring_report growth_report
SET
    "Project/Block" = fld."Block",
    "Sector" = fld."GP",
    "AWC" = fld."Village/Hamlet"
FROM
    awc_fields fld
WHERE
    growth_report."Beneficiary ID" = fld."Individual ID";




----------------------------------Growth monitoring fields update scripts---------------------------------------------


WITH growth_monitoring_fields AS (
SELECT
   CASE
        WHEN follow_up."Weight for age Status" = 'Severely Underweight' THEN 'Yes'
        ELSE 'No'
    END AS "Severely Underweight",
    ind.id AS "Individual ID",
    CASE
        WHEN follow_up."Weight for age Status" = 'Moderately Underweight' THEN 'Yes'
        ELSE 'No'
    END AS "Moderately Underweight",
    CASE
        WHEN follow_up."Weight for Height Status" = 'SAM' THEN 'Yes'
        ELSE 'No'
    END AS "SAM",
    CASE
        WHEN follow_up."What is the treatment advise for the SAM/MAM/GF2 child?" = 'Referred to CHC' THEN 'Yes'
        ELSE 'No'
    END AS "Was the child facilitated to CHC by QRT",
    CASE
        WHEN follow_up."Weight for Height Status" = 'MAM' THEN 'Yes'
        ELSE 'No'
    END AS "MAM",
    CASE
        WHEN follow_up."Height for age Status" = 'Moderately Stunted' THEN 'Yes'
        ELSE 'No'
    END AS "Moderately Stunted",
    CASE
        WHEN follow_up."Height for age Status" = 'Severely stunted' THEN 'Yes'
        ELSE 'No'
    END AS "Severely Stunted",
    follow_up."Growth Faltering",
    follow_up.encounter_date_time as "Date of Measurement",
    follow_up."Height",
    follow_up."Weight",
    follow_up."Is the child going to PPK?",
    follow_up."Is the child going to Creche?",
    follow_up."Is the child being currently exclusively breastfed?",
    follow_up."Is the child being currently breastfed?",
    follow_up."Number of day attended AWC (last month)",
    follow_up."Is the child receiving egg from AWC",
    follow_up."Is the child receiving THR from AWC",
    follow_up."Did the child attended VHND last month",
    follow_up."What is the treatment advise for the SAM/MAM/GF2 child?",
    follow_up."Is the child enrolled in the CMAM program?",
    follow_up."Is the child availing benefits (ATHR) under the CMAM program?",
    follow_up."Did you receive additional THR (MSPY)?"
    FROM
        apfodisha.individual ind
    JOIN apfodisha.individual_child enrl ON
    	enrl.individual_id = ind.id
    	AND enrl.enrolment_date_time IS NOT NULL
    	AND ind.is_voided = false
	JOIN apfodisha.individual_child_growth_monitoring follow_up ON
    	follow_up.program_enrolment_id = enrl.id
   		AND follow_up.encounter_date_time IS NOT NULL
    	AND follow_up.is_voided = false
    LEFT JOIN individual_relationship ir ON
    	ind.id = ir.individual_b_id
    	AND ir.is_voided = false
	LEFT JOIN individual_relationship_type irt ON
    	irt.id = ir.relationship_type_id
    	AND irt.name IN ('Mother-Son', 'Mother-Daughter')
	LEFT JOIN apfodisha.individual mother ON
    	mother.id = ir.individual_a_id
    	AND mother.is_voided = false
)
UPDATE
    apfodisha.individual_child_growth_monitoring_report growth_report
SET
    "Severely Underweight" = fld."Severely Underweight",
    "Moderately Underweight" = fld."Moderately Underweight",
    "SAM" = fld."SAM",
    "Date of Measurement" = fld."Date of Measurement",
    "Was the child facilitated to CHC by QRT" = fld."Was the child facilitated to CHC by QRT",
    "MAM" = fld."MAM",
    "Moderately Stunted" = fld."Moderately Stunted",
    "Severely Stunted" = fld."Severely Stunted",
    "Growth Faltering" = fld."Growth Faltering",
    "Height" = fld."Height",
    "Weight" = fld."Weight",
    "Is the child going to PPK?" = fld."Is the child going to PPK?",
    "Is the child going to Creche?" = fld."Is the child going to Creche?",
    "Is the child being currently exclusively breastfed?" = fld."Is the child being currently exclusively breastfed?",
    "Number of day attended AWC (last month)" = fld."Number of day attended AWC (last month)",
    "Is the child receiving egg from AWC" = fld."Is the child receiving egg from AWC",
    "Is the child receiving THR from AWC" = fld."Is the child receiving THR from AWC",
    "Did the child attended VHND last month" = fld."Did the child attended VHND last month",
    "What is the treatment advise for the SAM/MAM/GF2 child?" = fld."What is the treatment advise for the SAM/MAM/GF2 child?",
    "Is the child enrolled in the CMAM program" = fld."Is the child enrolled in the CMAM program",
    "Is the child availing benefits (ATHR) under the CMAM program?" = fld."Is the child availing benefits (ATHR) under the CMAM program?",
    "Did you receive additional THR (MSPY)?" = fld."Did you receive additional THR (MSPY)?"

FROM
    growth_monitoring_fields fld
WHERE
    growth_report."Beneficiary ID" = fld."Individual ID";









--------------------------------------Update individual Fields script-----------------------------------------------------------

UPDATE apfodisha.individual_child_growth_monitoring_report report
SET
    report."Beneficiary ID" = ind.id,
    report."Name of Child Benefeciaries" = CONCAT(ind.first_name, ' ', ind.last_name),
    report."Date of Birth" = ind.date_of_birth,
    report."Father's name" = ind."Father/Husband's name",
    report."Mother's Name" = ind."Mother's Name"
FROM
    apfodisha.individual ind
    JOIN apfodisha.individual_child enrl ON
        enrl.individual_id = ind.id
        AND enrl.enrolment_date_time IS NOT NULL
        AND enrl.is_voided = false
    JOIN apfodisha.individual_child_growth_monitoring follow_up ON
        follow_up.program_enrolment_id = enrl.id
        AND follow_up.encounter_date_time IS NOT NULL
        AND follow_up.is_voided = false
WHERE
    ind.is_voided = false
    AND ind.last_modified_date_time > :input_date
    AND report."Beneficiary ID" = ind.id;


