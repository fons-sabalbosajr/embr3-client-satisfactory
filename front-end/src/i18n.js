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
            assistPersonnel: "Assisted Personnel",
            employeeName: "Employee Name",
            agencyName: "Agency Name",
          },

          summary: {
            confirmTitle: "Please confirm your responses",
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
          allRightsReserved: "© {{year}} EMB Region III. All rights reserved.",
          surveyFooter: "Environmental Management Bureau Region III Online Customer Satisfaction Measurement. All rights reserved.",

          // Post-survey agency prompt
          agencyPrompt: {
            title: "Environmental Management Bureau — Region III",
            subtitle: "Stay connected with us for updates and inquiries.",
            close: "Close",
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
          featureActionTitle: "Makatutulong na pagbabago",
          featureActionText:
            "Sinusuri ang feedback para malaman ang dapat ipagpatuloy at dapat ayusin.",

          // i18n.js extras
          subtitle:
            "Ang Client Satisfaction Measurement (CSM) ay naglalayong masubaybayan ang karanasan ng taumbayan hinggil sa kanilang pakikipag-transaksyon sa mga tanggapan ng gobyerno. Makatutulong ang inyong kasagutan ukol sa inyong naging karanasan sa kakatapos lamang ng transaksyon, upang mas mapabuti at lalong mapahusay ang aming serbisyo publiko. Ang personal na impormasyon na iyong ibabahagi ay mananatiling kumpidensyal. Maari ring piliin na hindi sagutin ang sarbey na ito.",
          takeSurvey: "Sagutan ang Survey",
          selectLanguage: "Piliin ang Wika",
          toggleColor: "I-toggle ang tema",

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
          companyNamePlaceholder: "Pangalan ng Kumpanya/Institusyon",
          enterCompanyName: "Ilagay ang pangalan ng kumpanya",
          agencyPlaceholder: "Ilagay ang pangalan ng ahensya",
          agePlaceholder: "Ilagay ang Edad",
          ageLabel: "Edad",
          genderLabel: "Kasarian",
          selectGender: "Pumili ng Kasarian",
          regionLabel: "Rehiyon",
          agencyLabel: "Ahensya",
          serviceAvailedLabel: "Uri ng Transaksyon o Serbisyo",
          selectServicePlaceholder: "Pumili Transaksyon o Serbisyo",
          selectService: "Kailangang punan ang bahaging ito.",
          regionAgencyNote:
            "Ang rehiyon at ahensya ay awtomatiko nang nakalagda.",
          selectAnswerPlaceholder: "Pumili ng Sagot",
          selectRequired: "Ang bahaging ito ay kailangang punan.",

          // Assisted personnel and service groups (Filipino)
          assistPersonnel: {
            label: "Pangalan ng Kawani na Tumulong",
            placeholder: "Ilagay ang pangalan ng kawani na tumulong sa iyo",
          },
          serviceGroups: {
            internal: "Panloob na Serbisyo",
            external: "Panlabas na Serbisyo",
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
            RatherNotSay: "Mas mabuti nang hindi sabihin",
          },

          surveyType: {
            internal: "Panloob na Survey",
            external: "Panlabas na Survey",
            info: "Ano ang pagkakaiba?",
          },
          surveyTypeInfo: {
            title: "Mga Uri ng Survey",
            internalTitle: "Panloob na Survey",
            internalDesc: "Para sa mga empleyado ng EMB Region III. Awtomatikong itinakda ang uri ng kliyente bilang \"Gobyerno\" at mayroong opsyonal na field para sa iyong pangalan.",
            externalTitle: "Panlabas na Survey",
            externalDesc: "Para sa mga mamamayan, negosyo, at iba pang ahensya ng gobyerno na nakikipag-transaksyon sa EMB Region III.",
          },
          internalSurveyBadge: "Panloob na Survey — Empleyado ng EMB Region III",
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
                "Hindi ko alam kung ano ang Citizen's Charter.",
                "Nalaman ko lang ang Citizen's Charter nang makita ko ang Citizen's Charter ng opisina na ito.",
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
            companyName: "Pangalan ng Establisyamento/Proponent",
            gender: "Kasarian",
            age: "Edad",
            serviceAvailed: "Serbisyong Ginamit",
            assistPersonnel: "Kawani na Tumulong",
            employeeName: "Pangalan ng Empleyado",
            agencyName: "Pangalan ng Ahensya",
          },

          summary: {
            confirmTitle: "Pakitiyak ang iyong mga sagot",
            submit: "Ipasa",
            cancel: "Kanselahin",
            thankYou: "Maraming salamat sa iyong puna!",
            submissionFailed: "Nabigo ang pagsusumite",
            submissionError: "May naganap na error sa pagsusumite ng puna.",
            exitTitle: "Tapusin agad ang Survey?",
            exitText:
              "Sigurado ka bang nais mong bumalik sa home? Hindi masasave ang iyong progress.",
            quitSurvey: "Tapusin ang Survey",
            stay: "Manatili",
            incompleteCC: "Hindi kumpleto ang sagot sa Citizens Charter",
            atLeastOneCCRequired:
              "Sagutan ang kahit isang tanong sa Citizens Charter bago magpatuloy.",
          },

          // Misc UI
          loadError: "Hindi nagload ang mga tanong. Suriin ang API o koneksyon.",
          errorLabel: "Error",
          pleaseFillOut: "Pakipunan ito.",
          answerHere: "Isulat dito...",
          toggleTheme: "Palitan ang Tema",
          responsesRecorded: "{{count}} sagot ang naitala",
          responsesRecorded_plural: "{{count}} sagot ang naitala",
          allRightsReserved: "© {{year}} EMB Region III. Lahat ng karapatan ay nakalaan.",
          surveyFooter: "Environmental Management Bureau Region III Online Customer Satisfaction Measurement. Lahat ng karapatan ay nakalaan.",

          // Post-survey agency prompt
          agencyPrompt: {
            title: "Environmental Management Bureau — Region III",
            subtitle: "Makipag-ugnayan sa amin para sa mga update at katanungan.",
            close: "Isara",
          },
        },
      },
    },
  });

export default i18n;
