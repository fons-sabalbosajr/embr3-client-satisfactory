// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    resources: {
      en: {
        translation: {
          // Home.jsx
          agencyTitle: "Republic of the Philippines",
          department: "DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES",
          bureau: "ENVIRONMENTAL MANAGEMENT BUREAU III",
          address1:
            "Masinop Corner, Matalino St., Diosdado Macapagal Government Center",
          address2: "Maimpis, City of San Fernando, Pampanga",
          csmTitle: "Online Client Satisfaction Measurement",
          feedbackText: "We want your feedback!",

          heroKicker: "Client Feedback Portal",
          heroBigSlogan: "HELP US IMPROVE!",
          heroSlogan: "Help us improve — share your experience in just a few minutes.",
          heroPillFast: "2-minute survey",
          heroPillConfidential: "Confidential",
          heroPillMobile: "Mobile-friendly",
          featuresTitle: "Built for better public service",
          featuresSubtitle:
            "Your feedback helps us improve service quality, transparency, and response time.",
          featureQuickTitle: "Quick and simple",
          featureQuickText: "Answer a short set of questions — no complicated steps.",
          featureSecureTitle: "Secure and respectful",
          featureSecureText:
            "Your responses are handled responsibly and used to improve services.",
          featureActionTitle: "Actionable improvements",
          featureActionText:
            "We review feedback to identify what works and what needs attention.",

          // i18n.js extras
          subtitle:
            "This Client Satisfaction Measurement (CSM) tracks the customer experience of government offices. Your feedback on your recently concluded transaction will help this office provide a better service. Personal information shared will be kept confidential and you always have the option not to answer this form.",
          takeSurvey: "Take the Survey",
          selectLanguage: "Select Language",
          toggleColor: "Toggle color scheme",
          backToTop: "Back to top",

          // Survey.jsx
          personalInfo: "Personal Information",
          submitSurvey: "Submit Survey",
          cancel: "Cancel",
          next: "Next",
          back: "Back",
          thankYou: "Thank you for your feedback!",

          // ClientInfoCard.jsx
          clientTypeLabel: "Client Type",
          selectClientType: "Select client type",
          clientTypeCitizen: "Citizen",
          clientTypeBusiness: "Business",
          clientTypeGovernment: "Government",
          companyNamePlaceholder: "Company Name",
          enterCompanyName: "Enter company name",
          agencyPlaceholder: "Enter agency name",
          ageLabel: "Age",
          agePlaceholder: "Enter age",
          ageInvalid: "Enter a valid age (1–120).",
          genderLabel: "Gender",
          selectGender: "Select gender",
          regionLabel: "Region",
          agencyLabel: "Agency",
          selectServicePlaceholder: "Service Availed",
          serviceAvailedLabel: "Select service(s) Availed",
          selectService: "This field is required",
          regionAgencyNote: "Region and agency are pre-filled automatically.",
          selectAnswerPlaceholder: "Select Answer",
          selectRequired: "This field is required",

          // Assisted personnel and service groups
          assistPersonnel: {
            label: "Assisted Personnel Name",
            placeholder: "Enter name of personnel who assisted you",
            hint: "Start typing to see names from past surveys.",
          },
          analysisControlNumber: {
            label: "Control Number",
            placeholder: "Control number on your result of analysis",
          },
          analysisResultType: {
            label: "Type of Result of Analyses",
            placeholder: "e.g., water, wastewater/effluent, ambient air, soil",
            required: "Please specify the type of result of analyses.",
            help: "Please fill these in because you selected Analysis of Environmental Samples.",
          },
          clientInfo: {
            aboutYou: "About you",
            serviceSection: "Service availed",
            autoFilled: "Office visited",
            companyNameLabel: "Company / Establishment Name",
            agencyNameLabel: "Agency Name",
            optional: "Optional",
          },
          serviceGroups: {
            internal: "Internal Services",
            external: "External Services",
            other: "Other Services",
          },

          gender: {
            Male: "Male",
            Female: "Female",
            "LGBTQ++": "LGBTQ++",
            RatherNotSay: "Rather Not Say",
          },

          surveyType: {
            internal: "Internal Survey",
            external: "External Survey",
            info: "What's the difference?",
          },
          surveyTypeInfo: {
            title: "Survey Types",
            internalTitle: "Internal Survey",
            internalDesc: "For EMB Region III employees. The client type is automatically set to \"Government\" and an optional field for your name is provided.",
            externalTitle: "External Survey",
            externalDesc: "For citizens, businesses, and other government agencies transacting with EMB Region III.",
          },
          internalSurveyBadge: "Internal Survey — EMB Region III Employee",
          employeeName: {
            label: "Employee Name (Optional)",
            placeholder: "Enter your name (optional)",
          },

          step: {
            primaryInfo: "Primary Info",
            citizensCharter: "Citizens Charter",
            sqdShort: "SQD",
            sqdFull: "Service Quality Dimensions (SQD)",
          },

          questions: {
            Q7: {
              text: "Which of the following best describes your awareness of a Citizen's Charter?",
              options: [
                "I know what a Citizen's Charter is and I saw it in this office.",
                "I know what a Citizen's Charter is but I did not see it in this office.",
                "I learned of the Citizen's Charter only when I saw this office' Citizens Charter.",
                "I do not know what a Citizen's Charter is.",
              ],
            },
            Q8: {
              text: "If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was followed?",
              options: [
                "Easy to see and follow",
                "Somewhat to see and follow",
                "Difficult to see and follow",
                "Not visible at all",
                "Not Applicable (N/A)",
              ],
            },
            Q9: {
              text: "If aware of CC (answered 1-3 in CC1), how much did the CC help you in your transactions?",
              options: [
                "Help very much",
                "Somewhat helped",
                "Did not help",
                "Not Applicable (N/A)",
              ],
            },
            Q10: {
              text: "I am satisfied with the service that I availed.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q11: {
              text: "I spent a reasonable amount of time for my transaction.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q12: {
              text: "The office followed the transaction's requirements and steps based on the information provided.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q13: {
              text: "The steps (including payment) I needed to do for my transaction were easy and simple.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q14: {
              text: "I easily found information about my transaction from the office's website.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q15: {
              text: "I paid a reasonable amount of fees for my transaction (If service was free mark the N/A icon).",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q16: {
              text: "I am confident my online transaction was secure.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q17: {
              text: "The office online support was available, and (if asked questions) online support was quick to respond.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q18: {
              text: "I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.",
              options: {
                StronglyAgree: "Strongly Agree",
                Agree: "Agree",
                Satisfactory: "Neither Agree nor Disagree",
                Disagree: "Disagree",
                StronglyDisagree: "Strongly Disagree",
                NA: "Not Applicable",
              },
            },
            Q19: {
              text: "Do you have any other comments or suggestions?",
              options: [],
              placeholder: "Any improvements or suggestions...", // ENGLISH
            },
          },

          rating: {
            stronglyDisagree: "Strongly Disagree",
            disagree: "Disagree",
            satisfactory: "Satisfactory",
            agree: "Agree",
            stronglyAgree: "Strongly Agree",
            notApplicable: "Not Applicable",
          },

          section: {
            personalInfo: "Personal Information",
            citizensCharter: "Citizen's Charter",
            sqd: "Service Quality Dimensions",
            remarks: "Remarks / Suggestions",
          },

          summaryLabels: {
            region: "Region",
            agency: "Agency",
            customerType: "Customer Type",
            companyName: "Establishment/Proponent Name",
            gender: "Gender",
            age: "Age",
            serviceAvailed: "Service Availed",
            analysisResultType: "Type of Result of Analyses",
            analysisControlNumber: "Analysis Control Number",
            assistPersonnel: "Assisted Personnel",
            employeeName: "Employee Name",
            agencyName: "Agency Name",
          },

          survey: {
            hint: {
              selectClientType: "Select your client type to continue.",
              selectService: "Select at least one service availed.",
              selectGender: "Select your gender to continue.",
              enterCompany: "Enter your company name to continue.",
              enterAgency: "Enter your agency name to continue.",
              enterAnalysisType: "Specify the type of result of analyses to continue.",
              rateRemaining: "Please rate the remaining items to continue.",
            },
          },

          summary: {
            confirmTitle: "Review your answers",
            reviewLead: "Please check your answers. Go back if you need to change anything, then submit.",
            goBackEdit: "Go back and edit",
            submit: "Submit",
            cancel: "Cancel",
            thankYou: "Thank you for your feedback!",
            submissionFailed: "Submission Failed",
            submissionError: "An error occurred while submitting feedback.",
            exitTitle: "Exit Survey?",
            exitText:
              "Are you sure you want to return home? Your progress will not be saved.",
            quitSurvey: "Quit Survey",
            stay: "Stay",
            incompleteCC: "Citizens Charter answers incomplete",
            atLeastOneCCRequired:
              "Please answer at least one Citizens Charter question before proceeding.",
          },

          // Misc UI
          loadError: "Failed to load questions. Check the API or network.",
          errorLabel: "Error",
          pleaseFillOut: "Please fill this out.",
          answerHere: "Answer here...",
          toggleTheme: "Toggle Theme",
          responsesRecorded: "{{count}} response recorded",
          responsesRecorded_plural: "{{count}} responses recorded",
          responsesRecorded_other: "{{count}} responses recorded",
          allRightsReserved: "© {{year}} EMB Region III. All rights reserved.",
          surveyFooter: "Environmental Management Bureau Region III Online Customer Satisfaction Measurement. All rights reserved.",

          // Post-survey agency prompt
          agencyPrompt: {
            title: "Environmental Management Bureau — Region III",
            subtitle: "Stay connected with us for updates and inquiries.",
            close: "Close",
          },

          // Landing.jsx
          landing: {
            nav: { overview: "Overview", how: "How it works", types: "Survey types", measure: "What we measure", vera: "Meet VERA", contact: "Contact" },
            eyebrow: "Online Client Satisfaction Measurement",
            title: "Your feedback shapes better public service.",
            lead: "Tell the Environmental Management Bureau Region III how your transaction went. This short, anonymous survey helps us shorten steps, clarify requirements and improve every service we deliver.",
            ctaHow: "See how it works",
            arta: {
              eyebrow: "In compliance with",
              title: "Anti-Red Tape Authority — Client Satisfaction Measurement",
              text: "This survey follows the harmonized Client Satisfaction Measurement guidelines of the Anti-Red Tape Authority under Republic Act No. 11032, the Ease of Doing Business and Efficient Government Service Delivery Act of 2018.",
            },
            cta: {
              title: "Ready to share your experience?",
              lead: "It takes about three minutes, and every response is read.",
              client: "Open the survey page",
            },
            pills: { time: "About 3 minutes", anon: "Anonymous", lang: "English · Filipino", arta: "Reported to ARTA" },
            qrTitle: "Answer on your phone",
            qrHint: "Scan the code or open the survey link on any device.",
            stats: { responses: "Responses recorded", dimensions: "Quality dimensions", types: "Survey types", languages: "Languages" },
            why: {
              eyebrow: "Why it matters",
              title: "Every answer becomes an action item.",
              items: [
                { t: "Measured, not guessed", d: "Ratings on time, steps, fees, integrity and outcome give the office a score for each service dimension." },
                { t: "Reported transparently", d: "Results are consolidated quarterly and submitted to the Anti-Red Tape Authority as part of the office's compliance." },
                { t: "Acted on", d: "Low-scoring dimensions and client remarks are reviewed by management to simplify requirements and improve support." },
              ],
            },
            how: {
              eyebrow: "How it works",
              title: "Three short steps.",
              steps: [
                { t: "Tell us who you are", d: "Client type, sex, age and the service you availed. No name or email required." },
                { t: "Citizen's Charter", d: "Three questions on whether you saw the office's Citizen's Charter and whether it helped." },
                { t: "Rate the service", d: "Nine statements on the quality of the service, from Strongly Disagree to Strongly Agree, plus optional remarks." },
              ],
            },
            types: {
              eyebrow: "Survey types",
              title: "Choose the survey that applies to you.",
              external: { t: "External survey", d: "For citizens, businesses and other government agencies that transacted with EMB Region III.", cta: "Start external survey" },
              internal: { t: "Internal survey", d: "For EMB Region III employees who availed internal services such as HR, records and finance.", cta: "Start internal survey" },
            },
            measure: {
              eyebrow: "What we measure",
              title: "Eight service quality dimensions, one overall rating.",
              lead: "Each statement is scored as the share of clients who agree or strongly agree. The office targets at least 80% on every dimension.",
              dims: [
                ["Responsiveness", "Time spent on the transaction was reasonable."],
                ["Reliability", "Requirements and steps were followed as published."],
                ["Access & Facilities", "Online steps and payment were simple."],
                ["Communication", "Information was easy to find."],
                ["Costs", "Fees were acceptable."],
                ["Integrity", "The online transaction was secure."],
                ["Assurance", "Online support was available and responsive."],
                ["Outcome", "You got what you needed, or a denial was explained."],
              ],
            },
            vera: {
              eyebrow: "Meet VERA",
              title: "Turning your feedback into",
              accent: "clear, timely insight",
              lead: "VERA — the Virtual Environmental Response Assistant — is built into the OCSM platform. It helps EMB Region III personnel read survey results quickly, spot the services that need attention and act on what clients say.",
              desc: "VERA works inside the secured staff workspace and answers only from consolidated survey results. Responses are anonymous, so nothing in them identifies you.",
              note: "Available to authorized EMB Region III personnel only.",
              features: [
                { t: "Live survey insights", d: "Answers are grounded in up-to-date survey figures, not guesswork." },
                { t: "Service quality scoring", d: "Tracks every service quality dimension and flags the strongest and the weakest." },
                { t: "Trends over time", d: "Follows monthly response volume and satisfaction so changes are noticed early." },
                { t: "Client remarks", d: "Brings the latest comments forward so they are read and acted on." },
                { t: "Citizen's Charter awareness", d: "Monitors how many clients know, see and find the Charter helpful." },
                { t: "Private by design", d: "Works with anonymous, aggregated responses inside a signed-in workspace." },
              ],
            },
            footer: {
              tagline: "Online Client Satisfaction Measurement",
              links: "Quick links",
              clientPage: "Survey page",
              privacy: "Privacy",
              privacyNote: "Responses are anonymous and reported in aggregate to the Anti-Red Tape Authority.",
              contact: "Contact us",
              address: "Office address",
              phone: "Telephone",
              email: "Email",
              website: "Website",
              facebook: "Facebook",
              compliance: "Compliance",
            },
          },
        },
      },

      fil: {
        translation: {
          // Home.jsx
          agencyTitle: "Republic of the Philippines",
          department: "DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES",
          bureau: "ENVIRONMENTAL MANAGEMENT BUREAU III",
          address1:
            "Masinop Corner, Matalino St., Diosdado Macapagal Government Center",
          address2: "Maimpis, City of San Fernando, Pampanga",
          csmTitle: "Online Client Satisfaction Measurement",
          feedbackText: "Kailangan namin ang iyong puna!",

          heroKicker: "Client Feedback Portal",
          heroBigSlogan: "TULUNGAN KAMING MAPABUTI!",
          heroSlogan: "Tulungan kaming mapabuti — ibahagi ang iyong karanasan sa loob lamang ng ilang minuto.",
          heroPillFast: "Mabilis na survey",
          heroPillConfidential: "Kumpidensyal",
          heroPillMobile: "Mobile-friendly",
          featuresTitle: "Para sa mas maayos na serbisyo publiko",
          featuresSubtitle:
            "Ang inyong feedback ay tumutulong sa pagpapabuti ng kalidad ng serbisyo, transparency, at bilis ng tugon.",
          featureQuickTitle: "Mabilis at simple",
          featureQuickText: "Sagutan ang maikling set ng tanong — walang komplikadong proseso.",
          featureSecureTitle: "Ligtas at may paggalang",
          featureSecureText:
            "Pinangangasiwaan nang maayos ang inyong sagot at ginagamit para mapahusay ang serbisyo.",
          featureActionTitle: "May nagagawang pagbabago",
          featureActionText:
            "Sinusuri ang feedback para malaman ang dapat ipagpatuloy at dapat ayusin.",

          // i18n.js extras
          subtitle:
            "Ang Client Satisfaction Measurement (CSM) ay naglalayong masubaybayan ang karanasan ng taumbayan hinggil sa kanilang pakikipag-transaksyon sa mga tanggapan ng gobyerno. Makatutulong ang inyong kasagutan ukol sa inyong naging karanasan sa kakatapos lamang ng transaksyon, upang mas mapabuti at lalong mapahusay ang aming serbisyo publiko. Ang personal na impormasyon na iyong ibabahagi ay mananatiling kumpidensyal. Maari ring piliin na hindi sagutin ang sarbey na ito.",
          takeSurvey: "Sagutan ang Survey",
          selectLanguage: "Piliin ang Wika",
          toggleColor: "Palitan ang tema",
          backToTop: "Bumalik sa itaas",

          // Survey.jsx
          personalInfo: "Impormasyon ng Kliyente",
          submitSurvey: "Ipasa ang Survey",
          cancel: "Kanselahin",
          next: "Susunod",
          back: "Bumalik",
          thankYou: "Maraming salamat sa iyong puna!",

          // ClientInfoCard.jsx
          clientTypeLabel: "Uri ng Kliyente",
          selectClientType: "Pumili ng uri ng kliyente",
          clientTypeCitizen: "Mamamayan",
          clientTypeBusiness: "Negosyo",
          clientTypeGovernment: "Gobyerno (Empleyado o Ahensya)",
          companyNamePlaceholder: "Pangalan ng kumpanya o institusyon",
          enterCompanyName: "Ilagay ang pangalan ng kumpanya",
          agencyPlaceholder: "Ilagay ang pangalan ng ahensya",
          agePlaceholder: "Ilagay ang edad",
          ageInvalid: "Maglagay ng tamang edad (1–120).",
          ageLabel: "Edad",
          genderLabel: "Kasarian",
          selectGender: "Pumili ng kasarian",
          regionLabel: "Rehiyon",
          agencyLabel: "Ahensya",
          serviceAvailedLabel: "Uri ng Transaksyon o Serbisyo",
          selectServicePlaceholder: "Pumili ng transaksyon o serbisyo",
          selectService: "Kailangang sagutan ito.",
          regionAgencyNote:
            "Awtomatiko nang nakalagay ang rehiyon at ahensya.",
          selectAnswerPlaceholder: "Pumili ng sagot",
          selectRequired: "Kailangang sagutan ito.",

          // Assisted personnel and service groups (Filipino)
          assistPersonnel: {
            label: "Pangalan ng Kawaning Tumulong",
            placeholder: "Ilagay ang pangalan ng kawaning tumulong sa iyo",
            hint: "Mag-type para makita ang mga pangalan mula sa mga nakaraang survey.",
          },
          analysisControlNumber: {
            label: "Control Number",
            placeholder: "Control number na nasa resulta ng pagsusuri",
          },
          analysisResultType: {
            label: "Uri ng Resulta ng Pagsusuri",
            placeholder: "hal. tubig, wastewater/effluent, hangin, lupa",
            required: "Pakilagay ang uri ng resulta ng pagsusuri.",
            help: "Pakisagutan ito dahil pinili mo ang Analysis of Environmental Samples.",
          },
          clientInfo: {
            aboutYou: "Tungkol sa iyo",
            serviceSection: "Serbisyong natanggap",
            autoFilled: "Opisinang pinuntahan",
            companyNameLabel: "Pangalan ng Kumpanya / Establisimyento",
            agencyNameLabel: "Pangalan ng Ahensya",
            optional: "Opsyonal",
          },
          serviceGroups: {
            internal: "Internal na Serbisyo",
            external: "External na Serbisyo",
            other: "Iba pang Serbisyo",
          },

          step: {
            primaryInfo: "Pangunahing Impormasyon",
            citizensCharter: "Citizens Charter",
            sqdShort: "SQD",
            sqdFull: "Mga Dimensyon ng Kalidad ng Serbisyo (SQD)",
          },

          gender: {
            Male: "Lalaki",
            Female: "Babae",
            "LGBTQ++": "LGBTQ++",
            RatherNotSay: "Ayaw kong sabihin",
          },

          surveyType: {
            internal: "Internal na Survey",
            external: "External na Survey",
            info: "Ano ang pagkakaiba?",
          },
          surveyTypeInfo: {
            title: "Mga Uri ng Survey",
            internalTitle: "Internal na Survey",
            internalDesc: "Para sa mga empleyado ng EMB Region III. Awtomatikong \"Gobyerno\" ang uri ng kliyente, at puwede mong ilagay ang iyong pangalan kung gusto mo.",
            externalTitle: "External na Survey",
            externalDesc: "Para sa mga mamamayan, negosyo, at ibang ahensya ng gobyerno na may transaksyon sa EMB Region III.",
          },
          internalSurveyBadge: "Internal na Survey — Empleyado ng EMB Region III",
          employeeName: {
            label: "Pangalan ng Empleyado (Opsyonal)",
            placeholder: "Ilagay ang iyong pangalan (opsyonal)",
          },

          // Questions
          questions: {
            Q7: {
              text: "Alin sa mga sumusunod ang naglalarawan sa iyong kaalaman sa Citizen's Charter?",
              options: [
                "Alam ko kung ano ang Citizen's Charter at nakita ko ito sa opisina.",
                "Alam ko kung ano ang Citizen's Charter pero hindi ko ito nakita sa opisina.",
                "Nalaman ko lang ang Citizen's Charter nang makita ko ang Citizen's Charter ng opisina na ito.",
                "Hindi ko alam kung ano ang Citizen's Charter.",
              ],
            },
            Q8: {
              text: "Kung alam mo ang Citizen's Charter (sumagot ng 1-3 sa CC1), masasabi mo ba na madali itong makita at sundan?",
              options: [
                "Madaling makita at sundan",
                "Medyo madaling makita at sundan",
                "Mahirap makita at sundan",
                "Hindi nakikita",
                "Hindi Naaangkop (N/A)",
              ],
            },
            Q9: {
              text: "Kung alam mo ang Citizen's Charter (sumagot ng 1-3 sa CC1), gaano nakatulong ang Citizen's Charter sa iyong transaksyon?",
              options: [
                "Lubos na nakatulong",
                "Medyo nakatulong",
                "Hindi nakatulong",
                "Hindi Naaangkop (N/A)",
              ],
            },
            Q10: {
              text: "Nasiyahan ako sa serbisyong aking natanggap sa napuntahan na tanggapan.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q11: {
              text: "Makatwiran ang oras na aking ginugol para sa pagproseso ng aking transaksyon.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q12: {
              text: "Ang opisina ay sumusunod sa mga kinakailangang dokumento at mga hakbang batay sa impormasyong ibinigay.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q13: {
              text: "Ang mga hakbang sa pagproseso, kasama na ang pagbayad, ay madali at simple lamang.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q14: {
              text: "Mabilis at madali akong nakahanap ng impormasyon tungkol sa aking transaksyon mula sa opisina o sa website nito.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q15: {
              text: "Nagbayad ako ng makatwirang halaga para sa aking transaksyon. (Kung ang serbisyo ay ibinigay ng libre, piliin ang N/A na icon.)",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q16: {
              text: "Pakiramdam ko ay patas ang opisina sa lahat o walang palakasan sa aking transaksyon.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q17: {
              text: "Magalang akong pinagsilbihan ng mga tauhan, at (kung sakali ako ay humingi ng tulong), alam ko na sila ay handang tumulong sa akin.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q18: {
              text: "Nakuha ko ang kinakailangan ko mula sa tanggapan ng gobyerno. Kung tinanggihan man, ito ay sapat na ipinaliwanag sa akin.",
              options: {
                StronglyAgree: "Lubos na Sumasang-ayon",
                Agree: "Sumasang-ayon",
                Satisfactory: "Walang Kinikilingan",
                Disagree: "Hindi Sumasang-ayon",
                StronglyDisagree: "Lubos na Hindi Sumasang-ayon",
                NA: "Hindi Naaangkop",
              },
            },
            Q19: {
              text: "Mga suhestyon kung paano pa mapapabuti ang aming serbisyo (opsyonal)?",
              options: [],
              placeholder: "Mga suhestyon o komento...", // FILIPINO
            },
          },

          rating: {
            stronglyDisagree: "Lubos na Hindi Sumasang-ayon",
            disagree: "Hindi Sumasang-ayon",
            satisfactory: "Walang Kinikilingan",
            agree: "Sumasang-ayon",
            stronglyAgree: "Lubos na Sumasang-ayon",
            notApplicable: "Hindi Naaangkop",
          },

          section: {
            personalInfo: "Pangunahing Impormasyon",
            citizensCharter: "Citizen's Charter",
            sqd: "Mga Dimensyon ng Kalidad ng Serbisyo",
            remarks: "Komento / Suhestyon",
          },

          summaryLabels: {
            region: "Rehiyon",
            agency: "Ahensya",
            customerType: "Uri ng Kliyente",
            companyName: "Pangalan ng Establisimyento/Proponent",
            gender: "Kasarian",
            age: "Edad",
            serviceAvailed: "Serbisyong Natanggap",
            analysisResultType: "Uri ng Resulta ng Pagsusuri",
            analysisControlNumber: "Control Number ng Pagsusuri",
            assistPersonnel: "Kawaning Tumulong",
            employeeName: "Pangalan ng Empleyado",
            agencyName: "Pangalan ng Ahensya",
          },

          survey: {
            title: "Client Satisfaction Survey",
            stepOf: "Hakbang {{current}} ng {{total}}",
            progress: "Progreso ng survey",
            primaryInfoDesc: "Ilang detalye tungkol sa iyong pagpunta.",
            citizensCharterDesc: "Ilang tanong tungkol sa Citizen's Charter.",
            sqdDesc: "I-rate ang iyong karanasan.",
            hint: {
              selectClientType: "Pumili ng uri ng kliyente para makapagpatuloy.",
              selectService: "Pumili ng kahit isang serbisyong natanggap.",
              selectGender: "Pumili ng kasarian para makapagpatuloy.",
              enterCompany: "Ilagay ang pangalan ng kumpanya para makapagpatuloy.",
              enterAgency: "Ilagay ang pangalan ng ahensya para makapagpatuloy.",
              enterAnalysisType: "Ilagay ang uri ng resulta ng pagsusuri para makapagpatuloy.",
              rateRemaining: "Pakisagutan ang mga natitirang tanong para makapagpatuloy.",
            },
          },

          summary: {
            confirmTitle: "Suriin ang iyong mga sagot",
            reviewLead: "Pakitingnan kung tama ang iyong mga sagot. Bumalik kung may babaguhin, saka ipasa.",
            goBackEdit: "Bumalik at baguhin",
            submit: "Ipasa",
            cancel: "Kanselahin",
            thankYou: "Maraming salamat sa iyong puna!",
            submitting: "Ipinapasa ang iyong sagot…",
            submittingHint: "Sandali lang po.",
            retry: "Subukan muli",
            incomplete: "Hindi pa kumpleto",
            submissionFailed: "Hindi naipasa ang survey",
            submissionError: "Nagkaroon ng problema sa pagpasa ng iyong sagot.",
            submissionNetworkError: "Hindi makakonekta sa server. Pakitingnan ang iyong internet at subukan muli.",
            submissionRateLimited: "Masyadong maraming sabay-sabay na gumagamit ngayon. Maghintay sandali at subukan muli.",
            exitTitle: "Umalis sa survey?",
            exitText:
              "Sigurado ka bang gusto mong umalis? Hindi mase-save ang iyong mga sagot.",
            quitSurvey: "Umalis sa Survey",
            stay: "Ituloy ang survey",
            incompleteCC: "Hindi pa kumpleto ang sagot sa Citizen's Charter",
            atLeastOneCCRequired:
              "Sagutan ang kahit isang tanong sa Citizen's Charter bago magpatuloy.",
          },

          // Misc UI
          loadError: "Hindi na-load ang mga tanong. Pakitingnan ang iyong internet connection.",
          loading: "Naglo-load…",
          scanQr: "I-scan para buksan sa iyong device",
          errorLabel: "Error",
          pleaseFillOut: "Pakisagutan ito.",
          answerHere: "Isulat dito...",
          toggleTheme: "Palitan ang Tema",
          responsesRecorded: "{{count}} sagot ang naitala",
          responsesRecorded_plural: "{{count}} sagot ang naitala",
          responsesRecorded_other: "{{count}} sagot ang naitala",
          allRightsReserved: "© {{year}} EMB Region III. Lahat ng karapatan ay nakalaan.",
          surveyFooter: "Environmental Management Bureau Region III Online Customer Satisfaction Measurement. Lahat ng karapatan ay nakalaan.",

          // Post-survey agency prompt
          agencyPrompt: {
            title: "Environmental Management Bureau — Region III",
            subtitle: "Makipag-ugnayan sa amin para sa mga balita at tanong.",
            close: "Isara",
          },

          // Landing.jsx
          landing: {
            nav: { overview: "Tungkol dito", how: "Paano ito gumagana", types: "Uri ng survey", measure: "Ano ang sinusukat", vera: "Kilalanin si VERA", contact: "Makipag-ugnayan" },
            eyebrow: "Online Client Satisfaction Measurement",
            title: "Sa tulong ng iyong puna, mas gaganda ang serbisyo publiko.",
            lead: "Ibahagi sa Environmental Management Bureau Region III kung kumusta ang iyong transaksyon. Maikli lang ang survey at hindi kailangan ang iyong pangalan. Tinutulungan kami nitong paikliin ang mga hakbang, linawin ang mga requirement at pagbutihin ang bawat serbisyo.",
            ctaHow: "Paano ito gumagana",
            arta: {
              eyebrow: "Alinsunod sa",
              title: "Anti-Red Tape Authority — Client Satisfaction Measurement",
              text: "Sumusunod ang survey na ito sa mga alituntunin ng Client Satisfaction Measurement ng Anti-Red Tape Authority sa ilalim ng Republic Act No. 11032, ang Ease of Doing Business and Efficient Government Service Delivery Act of 2018.",
            },
            cta: {
              title: "Handa ka na bang ibahagi ang iyong karanasan?",
              lead: "Mga tatlong minuto lang ito, at binabasa namin ang bawat sagot.",
              client: "Buksan ang pahina ng survey",
            },
            pills: { time: "Mga 3 minuto", anon: "Walang pangalan", lang: "English · Filipino", arta: "Iniuulat sa ARTA" },
            qrTitle: "Sagutan sa iyong telepono",
            qrHint: "I-scan ang code o buksan ang link ng survey sa anumang device.",
            stats: { responses: "Mga sagot na naitala", dimensions: "Dimensyon ng kalidad", types: "Uri ng survey", languages: "Wika" },
            why: {
              eyebrow: "Bakit mahalaga",
              title: "Bawat sagot ay may katumbas na aksyon.",
              items: [
                { t: "Sinusukat, hindi hinuhulaan", d: "Mula sa mga rating sa oras, hakbang, bayarin, pagiging patas at resulta, nagkakaroon ng iskor ang bawat bahagi ng serbisyo." },
                { t: "Malinaw na iniuulat", d: "Pinagsasama-sama ang mga resulta kada quarter at ipinapasa sa Anti-Red Tape Authority bilang bahagi ng pagsunod ng tanggapan." },
                { t: "Ginagawan ng aksyon", d: "Tinitingnan ng pamunuan ang mabababang iskor at mga puna ng kliyente para gawing simple ang mga requirement at mapabuti ang serbisyo." },
              ],
            },
            how: {
              eyebrow: "Paano ito gumagana",
              title: "Tatlong maikling hakbang.",
              steps: [
                { t: "Ilang detalye tungkol sa iyo", d: "Uri ng kliyente, kasarian, edad at ang serbisyong natanggap. Hindi kailangan ng pangalan o email." },
                { t: "Citizen's Charter", d: "Tatlong tanong kung nakita mo ang Citizen's Charter ng tanggapan at kung nakatulong ito." },
                { t: "I-rate ang serbisyo", d: "Siyam na pahayag tungkol sa kalidad ng serbisyo, mula Lubos na Hindi Sumasang-ayon hanggang Lubos na Sumasang-ayon, at opsyonal na puna." },
              ],
            },
            types: {
              eyebrow: "Uri ng survey",
              title: "Piliin ang survey na para sa iyo.",
              external: { t: "External survey", d: "Para sa mga mamamayan, negosyo at ibang ahensya ng gobyerno na nakipagtransaksyon sa EMB Region III.", cta: "Simulan ang external survey" },
              internal: { t: "Internal survey", d: "Para sa mga empleyado ng EMB Region III na gumamit ng internal na serbisyo tulad ng HR, records at finance.", cta: "Simulan ang internal survey" },
            },
            measure: {
              eyebrow: "Ano ang sinusukat",
              title: "Walong dimensyon ng kalidad ng serbisyo, isang pangkalahatang rating.",
              lead: "Ang iskor ng bawat pahayag ay ang porsiyento ng mga kliyenteng sumasang-ayon o lubos na sumasang-ayon. Target ng tanggapan ang hindi bababa sa 80% sa bawat dimensyon.",
              dims: [
                ["Responsiveness", "Makatwiran ang oras na ginugol sa transaksyon."],
                ["Reliability", "Sinunod ang mga requirement at hakbang na nakasaad."],
                ["Access & Facilities", "Simple ang mga online na hakbang at pagbabayad."],
                ["Communication", "Madaling mahanap ang impormasyon."],
                ["Costs", "Katanggap-tanggap ang mga bayarin."],
                ["Integrity", "Ligtas ang online na transaksyon."],
                ["Assurance", "May online support at mabilis itong sumagot."],
                ["Outcome", "Nakuha mo ang kailangan mo, o ipinaliwanag ang pagtanggi."],
              ],
            },
            vera: {
              eyebrow: "Kilalanin si VERA",
              title: "Ang iyong puna, nagiging",
              accent: "malinaw na impormasyon",
              lead: "Si VERA — ang Virtual Environmental Response Assistant — ay bahagi ng OCSM platform. Tinutulungan nito ang mga kawani ng EMB Region III na mabilis na mabasa ang resulta ng survey, makita ang mga serbisyong kailangang ayusin, at kumilos ayon sa sinasabi ng mga kliyente.",
              desc: "Ginagamit lang si VERA ng mga kawaning naka-sign in, at sumasagot ito mula sa pinagsama-samang resulta ng survey. Walang pangalan ang mga sagot, kaya hindi ka makikilala.",
              note: "Para lamang sa mga awtorisadong kawani ng EMB Region III.",
              features: [
                { t: "Pinakabagong datos ng survey", d: "Nakabatay ang mga sagot sa pinakabagong bilang ng survey, hindi sa hula." },
                { t: "Iskor ng kalidad ng serbisyo", d: "Binabantayan ang bawat dimensyon ng kalidad at ipinapakita ang pinakamataas at pinakamababa." },
                { t: "Pagbabago bawat buwan", d: "Tinitingnan ang dami ng sagot at antas ng kasiyahan bawat buwan para maagang mapansin ang pagbabago." },
                { t: "Puna ng kliyente", d: "Ipinapakita ang mga pinakabagong komento para mabasa at maaksyunan." },
                { t: "Kaalaman sa Citizen's Charter", d: "Binabantayan kung ilang kliyente ang may alam, nakakita at natulungan ng Charter." },
                { t: "Protektado ang privacy", d: "Pinagsama-sama at walang pangalan ang mga sagot, at para lang ito sa mga naka-sign in na kawani." },
              ],
            },
            footer: {
              tagline: "Online Client Satisfaction Measurement",
              links: "Mga link",
              clientPage: "Pahina ng survey",
              privacy: "Privacy",
              privacyNote: "Walang pangalan ang mga sagot at pinagsama-sama itong iniuulat sa Anti-Red Tape Authority.",
              contact: "Makipag-ugnayan",
              address: "Address ng tanggapan",
              phone: "Telepono",
              email: "Email",
              website: "Website",
              facebook: "Facebook",
              compliance: "Pagsunod sa ARTA",
            },
          },
        },
      },
    },
  });

export default i18n;
