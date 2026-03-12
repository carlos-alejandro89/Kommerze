import { createContext, useContext, useState } from "react";
import { ModalPanicButton } from '@/components/modals/modal-panic-button';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({
    open: false,
    title: "",
    message: "",
  });

  const openModal = ({ data }) =>
    setModal({ open: true, data });

  const closeModal = () =>
    setModal(prev => ({ ...prev, open: false }));

  return (
    <ModalContext.Provider value={{ openModal }}>
      {children}

      <ModalPanicButton
        open={modal.open}
        data={modal.data}
        message={modal.message}
        onClose={closeModal}
      />
    </ModalContext.Provider>
  );
}

export const useModal = () => useContext(ModalContext);
