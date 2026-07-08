import { useNavigate } from 'react-router-dom';
import { FiChevronLeft } from 'react-icons/fi';

const MobileHeader = () => {
  const navigate = useNavigate();

  return (
    /* dir="ltr" برای قرارگیری دکمه در سمت چپ صرف‌نظر از RTL */
    <div className="w-full p-4 md:hidden sticky top-0 z-50 flex justify-start
                    pointer-events-none safe-area-pt" dir="ltr">
      <button
        onClick={() => navigate(-1)}
        /* pointer-events-auto: فقط خود دکمه کلیک‌پذیر باشد */
        className="pointer-events-auto p-2 rounded-xl bg-panel/80 backdrop-blur-md
                   text-ink-2 hover:text-ink hover:bg-panel shadow-lg transition-all
                   active:scale-95 flex items-center justify-center"
        aria-label="بازگشت"
      >
        <FiChevronLeft size={24} />
      </button>
    </div>
  );
};

export default MobileHeader;
