import React from 'react';
import BrochureHero from './BrochureHero';
import BrochureAbout from './BrochureAbout';
import BrochureServices from './BrochureServices';
import BrochureProducts from './BrochureProducts';
import BrochurePartners from './BrochurePartners';
import BrochureProjects from './BrochureProjects';
import BrochureWhyChoose from './BrochureWhyChoose';
import BrochureStats from './BrochureStats';
import BrochureFooter from './BrochureFooter';

// Forward ref to attach html2pdf to this container
const BrochurePrintLayout = React.forwardRef((props, ref) => {
  return (
    <div className="w-[210mm] bg-white text-black" ref={ref} id="downloadable-brochure">
      {/* We apply a strict A4 width (210mm) and handle page breaks */}
      <style>{`
        .pdf-page-break { page-break-after: always; break-after: page; }
      `}</style>
      
      <div className="pdf-page-break">
        <BrochureHero isPrint={true} />
      </div>
      
      <div className="pdf-page-break">
        <BrochureAbout isPrint={true} />
      </div>
      
      <div className="pdf-page-break">
        <BrochureServices isPrint={true} />
      </div>
      
      <div className="pdf-page-break">
        <BrochureProducts isPrint={true} />
      </div>
      
      <div className="pdf-page-break">
        <BrochurePartners isPrint={true} />
      </div>
      
      <div className="pdf-page-break">
        <BrochureProjects isPrint={true} />
      </div>

      <div className="pdf-page-break">
        <BrochureWhyChoose isPrint={true} />
      </div>
      
      <div className="pdf-page-break">
        <BrochureStats isPrint={true} />
      </div>

      <div>
        <BrochureFooter isPrint={true} />
      </div>
    </div>
  );
});

BrochurePrintLayout.displayName = 'BrochurePrintLayout';

export default BrochurePrintLayout;
