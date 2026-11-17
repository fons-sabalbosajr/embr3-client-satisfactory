// Shared agency header for the public client pages (/client and the survey).
// EMB and Bagong Pilipinas marks sit side by side on the left, the agency
// names in the middle and the ARTA mark on the right, over an ARTA-coloured
// ribbon. Class names are prefixed `ocsm-header` so the page stylesheets
// cannot collide with it.

import { useTranslation } from "react-i18next";
import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import ARTALogo from "../../assets/artalogo.svg";
import "./agencyheader.css";

export default function AgencyHeader() {
  const { t } = useTranslation();

  return (
    <header className="ocsm-header">
      <div className="ocsm-header-inner">
        <span className="ocsm-header-logos">
          <img src={EMBLogo} alt="Environmental Management Bureau Region III" />
          <img src={BPLogo} alt="Bagong Pilipinas" />
        </span>

        <div className="ocsm-header-text">
          <span className="ocsm-header-republic">{t("agencyTitle")}</span>
          <span className="ocsm-header-department">{t("department")}</span>
          <span className="ocsm-header-bureau">{t("bureau")}</span>
          <span className="ocsm-header-address">
            {t("address1")}, {t("address2")}
          </span>
        </div>

        <span className="ocsm-header-arta">
          <img src={ARTALogo} alt="Anti-Red Tape Authority" />
        </span>
      </div>
      <div className="ocsm-header-ribbon" aria-hidden="true" />
    </header>
  );
}
