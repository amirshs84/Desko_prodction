import { useNavigate } from 'react-router-dom';
import { FiChevronLeft } from 'react-icons/fi';

const MobileHeader = ({ title }) => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900 md:hidden sticky top-0 z-50">
      {/* عنوان صفحه در سمت راست (در حالت RTL) */}
      <h1 className="text-lg font-semibold text-gray-100">{title}</h1>
      
      {/* دکمه بازگشت در سمت چپ */}
      <button
        onClick={() => navigate(-1)}
        className="p-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 hover:shadow-lg transition-all active:scale-95 flex items-center justify-center"
        aria-label="بازگشت به صفحه قبل"
      >
        <FiChevronLeft size={24} />
      </button>
    </header>
  );
};
