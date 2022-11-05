class WhereClause{
    constructor(base, bigQ){
        this.base = base;
        this.bigQ = bigQ;
    }

    search(){
        const searchword = this.bigQ.search ? {
            name: {
                $regex: this.bigQ.search,
                $options: 'i'
            }
        } : {}

        this.base = this.base.find({...searchword})
        return this;
    }

    filter() {
        const copyQ = {...this.bigQ};

        delete copyQ["search"]
        delete copyQ["page"]
        delete copyQ["limit"]

        // convert bigQ into string (bigQ->copyQ)
        let stringOfCopyQ = JSON.stringify(copyQ)

        stringOfCopyQ = stringOfCopyQ.replace(/\b(gte|lte|gt|lt)\b/g, m => `$${m}`);

        const jsonOfCopyQ = JSON.parse(stringOfCopyQ);
        this.base = this.base.find(jsonOfCopyQ);
        return this;
    }

    pager(resultPerPage){
        let currentPage = 1;
        if(this.bigQ.page){
            currentPage = this.bigQ.page
        }

        const skipVal = resultPerPage * (currentPage - 1);
        this.base = this.base.limit(resultPerPage).skip(skipVal)
        return this;
    }
}

module.exports = WhereClause;