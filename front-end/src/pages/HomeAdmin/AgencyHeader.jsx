import EMBLogo from "../../assets/emblogo.svg";
import BPLogo from "../../assets/bplogo.svg";
import { useTranslation } from "react-i18next";

function AgencyHeader() {
  const { t } = useTranslation();
  return (
    <header className="agency-header-home">
      <div className="agency-header-inner-home">
        <div className="agency-header-top">
          <div className="agency-header-logos">
            <img src={EMBLogo} alt="EMB Logo" className="logo-svg-emb" />
            <img src={BPLogo} alt="BP Logo" className="logo-svg-bp" />
          </div>
        </div>
        <div className="agency-header-text">
          <span className="republic-text">{t("agencyTitle")}</span>
          <span className="department-text">{t("department")}</span>
          <span className="bureau-text">{t("bureau")}</span>
          <span className="address-text">
            {t("address1")}, {t("address2")}
          </span>
        </div>
      </div>
    </header>
  );
}

export default AgencyHeader;