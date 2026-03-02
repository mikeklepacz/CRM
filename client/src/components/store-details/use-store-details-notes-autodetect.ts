import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { extractFirstEmailAndPhone } from "@/components/store-details/store-details-dialog-utils";

export function useStoreDetailsNotesAutodetect(
  formData: any,
  setFormData: Dispatch<SetStateAction<any>>,
  setInitialData: Dispatch<SetStateAction<any>>,
) {
  const [pocFieldsManuallyEdited, setPocFieldsManuallyEdited] = useState({
    email: false,
    phone: false,
  });

  useEffect(() => {
    if (formData.notes && formData.notes.trim()) {
      const extracted = extractFirstEmailAndPhone(formData.notes);

      if (extracted.email && !pocFieldsManuallyEdited.email && extracted.email !== formData.poc_email) {
        setFormData((prev: any) => ({ ...prev, poc_email: extracted.email }));
      }

      if (extracted.phone && !pocFieldsManuallyEdited.phone && extracted.phone !== formData.poc_phone) {
        setFormData((prev: any) => ({ ...prev, poc_phone: extracted.phone }));
      }
    } else {
      if (!pocFieldsManuallyEdited.email && formData.poc_email) {
        setFormData((prev: any) => ({ ...prev, poc_email: "" }));
      }
      if (!pocFieldsManuallyEdited.phone && formData.poc_phone) {
        setFormData((prev: any) => ({ ...prev, poc_phone: "" }));
      }
    }
  }, [formData.notes, pocFieldsManuallyEdited, formData.poc_email, formData.poc_phone, setFormData]);

  const markPocFieldManuallyEdited = (field: string) => {
    if (field === "poc_email") {
      setPocFieldsManuallyEdited((prev) => ({ ...prev, email: true }));
    } else if (field === "poc_phone") {
      setPocFieldsManuallyEdited((prev) => ({ ...prev, phone: true }));
    }
  };

  const handleReDetect = () => {
    if (!formData.notes || !formData.notes.trim()) return;

    const extracted = extractFirstEmailAndPhone(formData.notes);

    if (extracted.email) {
      setFormData((prev: any) => ({ ...prev, poc_email: extracted.email }));
      setInitialData((prev: any) => ({ ...prev, poc_email: extracted.email }));
      setPocFieldsManuallyEdited((prev) => ({ ...prev, email: false }));
    }

    if (extracted.phone) {
      setFormData((prev: any) => ({ ...prev, poc_phone: extracted.phone }));
      setInitialData((prev: any) => ({ ...prev, poc_phone: extracted.phone }));
      setPocFieldsManuallyEdited((prev) => ({ ...prev, phone: false }));
    }
  };

  return {
    handleReDetect,
    markPocFieldManuallyEdited,
  };
}
